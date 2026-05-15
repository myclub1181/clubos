import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/staff/payroll?from=YYYY-MM-DD&to=YYYY-MM-DD
// Computes per-staff pay for the period:
// - Scheduled hours = (recurring weekly slot hours) * (count of that weekday in range) minus blocked exceptions
// - Class teaching hours = sum of ClassSession durations where this staff is in
//   the parent RecurringClass.assignedStaffIds (within range, non-canceled)
// - Hourly pay = (scheduled + class teaching) hours × StaffProfile.hourlyRate
// - Private lesson pay = sum over COMPLETED PrivateBookings in range with this coach:
//     - if PrivateLessonPayRate FLAT: rate.payValue
//     - if PrivateLessonPayRate PERCENT: lessonType.basePrice × (rate.payValue / 100)
//     - if no rate set: 0 (so it's visible)
// - Salary is reported as-is (per-period interpretation up to the owner)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  if (!fromStr || !toStr) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }
  const from = new Date(fromStr);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toStr);
  to.setHours(23, 59, 59, 999);
  const clubId = session.user.clubId;

  const [staff, availability, exceptions, payRates, completedBookings, classSessions] = await Promise.all([
    prisma.user.findMany({
      where: { clubId, role: { in: ["OWNER", "STAFF"] }, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        staffProfile: { select: { hourlyRate: true, salary: true, title: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.staffAvailability.findMany({
      where: { clubId, active: true },
      select: { userId: true, dayOfWeek: true, startTime: true, endTime: true },
    }),
    prisma.staffAvailabilityException.findMany({
      where: { clubId, date: { gte: from, lte: to } },
    }),
    prisma.privateLessonPayRate.findMany({
      where: { clubId },
      include: { lessonType: { select: { basePrice: true, title: true } } },
    }),
    prisma.privateBooking.findMany({
      where: {
        clubId,
        status: "COMPLETED",
        confirmedStartAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        coachId: true,
        lessonTypeId: true,
        pricePaid: true,
      },
    }),
    prisma.classSession.findMany({
      where: {
        clubId,
        canceled: false,
        startsAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        recurringClass: {
          select: { id: true, name: true, assignedStaffIds: true },
        },
      },
    }),
  ]);

  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  // Count occurrences of each weekday (0..6) in [from, to]
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
  const cursor = new Date(from);
  while (cursor <= to) {
    weekdayCount[cursor.getDay()]++;
    cursor.setDate(cursor.getDate() + 1);
  }

  const result = staff.map((s) => {
    const userAvail = availability.filter((a) => a.userId === s.id);
    const userExceptions = exceptions.filter((e) => e.userId === s.id);

    // Base scheduled minutes from recurring slots
    let scheduledMinutes = 0;
    for (const slot of userAvail) {
      const slotMinutes = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
      if (slotMinutes <= 0) continue;
      scheduledMinutes += slotMinutes * weekdayCount[slot.dayOfWeek];
    }

    // Subtract blocked exception days
    for (const ex of userExceptions) {
      const dow = new Date(ex.date).getDay();
      const daySlots = userAvail.filter((a) => a.dayOfWeek === dow);
      const dayBaseMinutes = daySlots.reduce(
        (acc, slot) => acc + (timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime)),
        0
      );
      if (ex.type === "UNAVAILABLE") {
        scheduledMinutes -= dayBaseMinutes;
      } else if (ex.type === "PARTIAL" && ex.startTime && ex.endTime) {
        const modifiedMinutes = timeToMinutes(ex.endTime) - timeToMinutes(ex.startTime);
        scheduledMinutes -= dayBaseMinutes - Math.max(0, modifiedMinutes);
      }
    }
    scheduledMinutes = Math.max(0, scheduledMinutes);
    const scheduledHours = +(scheduledMinutes / 60).toFixed(2);

    // Class teaching hours — only count sessions where this staff is assigned.
    let classMinutes = 0;
    const classTeachingDetail: { className: string; date: string; minutes: number }[] = [];
    for (const cs of classSessions) {
      const staffIds = Array.isArray(cs.recurringClass.assignedStaffIds)
        ? (cs.recurringClass.assignedStaffIds as string[])
        : [];
      if (!staffIds.includes(s.id)) continue;
      const dur = Math.max(0, (cs.endsAt.getTime() - cs.startsAt.getTime()) / 60000);
      classMinutes += dur;
      classTeachingDetail.push({
        className: cs.recurringClass.name,
        date: cs.startsAt.toISOString(),
        minutes: dur,
      });
    }
    const classHours = +(classMinutes / 60).toFixed(2);

    const hourlyRate = s.staffProfile?.hourlyRate ? Number(s.staffProfile.hourlyRate) : 0;
    const hourlyPay = +((scheduledHours + classHours) * hourlyRate).toFixed(2);
    const salary = s.staffProfile?.salary ? Number(s.staffProfile.salary) : 0;

    // Private lesson pay
    const myBookings = completedBookings.filter((b) => b.coachId === s.id);
    let privatePay = 0;
    const privateLessons = myBookings.map((b) => {
      const rate = payRates.find((r) => r.userId === s.id && r.lessonTypeId === b.lessonTypeId);
      let pay = 0;
      if (rate) {
        const payValue = Number(rate.payValue);
        if (rate.payType === "FLAT") {
          pay = payValue;
        } else if (rate.payType === "PERCENT") {
          const basePrice = b.pricePaid ? Number(b.pricePaid) : Number(rate.lessonType.basePrice ?? 0);
          pay = +(basePrice * (payValue / 100)).toFixed(2);
        }
      }
      privatePay += pay;
      return {
        bookingId: b.id,
        lessonTitle: rate?.lessonType.title ?? "Private lesson",
        pay,
      };
    });
    privatePay = +privatePay.toFixed(2);

    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      role: s.role,
      title: s.staffProfile?.title ?? null,
      scheduledHours,
      classHours,
      classSessionCount: classTeachingDetail.length,
      classTeachingDetail,
      hourlyRate,
      hourlyPay,
      salary,
      privateLessonCount: myBookings.length,
      privatePay,
      privateLessons,
      totalPay: +(hourlyPay + salary + privatePay).toFixed(2),
    };
  });

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    staff: result,
    totals: {
      hourly: +result.reduce((acc, r) => acc + r.hourlyPay, 0).toFixed(2),
      salary: +result.reduce((acc, r) => acc + r.salary, 0).toFixed(2),
      private: +result.reduce((acc, r) => acc + r.privatePay, 0).toFixed(2),
      total: +result.reduce((acc, r) => acc + r.totalPay, 0).toFixed(2),
    },
  });
}
