"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Availability = { userId: string; dayOfWeek: number; startTime: string; endTime: string };
type Exception = { id: string; date: string; type: string; startTime: string | null; endTime: string | null; note: string | null };
type ClassInstance = { classId: string; name: string; date: string; startTime: string; endTime: string };
type EventAssignment = { id: string; name: string; type: string; startsAt: string; endsAt: string };

type StaffSchedule = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  title: string | null;
  availability: Availability[];
  exceptions: Exception[];
  classes: ClassInstance[];
  events: EventAssignment[];
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay()); // Sunday-start week
  return out;
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function StaffSchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [data, setData] = useState<StaffSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  useEffect(() => {
    const from = toISODate(weekDays[0]);
    const to = toISODate(weekDays[6]);
    setLoading(true);
    fetch(`/api/staff/schedule?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d?.staff ?? []);
        setLoading(false);
      });
  }, [weekDays]);

  function shiftWeek(days: number) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + days);
    setWeekStart(startOfWeek(next));
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Schedule</h1>
          <p className="text-sm text-text-muted mt-1">
            Each staff member's weekly availability, assigned classes, and event coverage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftWeek(-7)}
            className="text-xs px-3 py-1.5 border border-app-border rounded-lg text-text-primary hover:bg-app-bg"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="text-xs px-3 py-1.5 border border-app-border rounded-lg text-text-primary hover:bg-app-bg"
          >
            This week
          </button>
          <button
            onClick={() => shiftWeek(7)}
            className="text-xs px-3 py-1.5 border border-app-border rounded-lg text-text-primary hover:bg-app-bg"
          >
            Next →
          </button>
        </div>
      </div>

      <p className="text-xs text-text-muted mb-3">
        Week of {weekDays[0].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      {loading ? (
        <p className="text-sm text-text-muted text-center py-16">Loading…</p>
      ) : data.length === 0 ? (
        <div className="bg-surface border border-app-border rounded-xl p-12 text-center">
          <p className="text-base font-medium text-text-primary mb-1">No staff yet</p>
          <p className="text-sm text-text-muted">
            Invite staff first on the <Link href="/dashboard/staff" className="underline">Directory</Link> page.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-app-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-app-bg border-b border-app-border">
                  <th className="sticky left-0 bg-app-bg text-left px-3 py-2 font-medium text-text-muted uppercase tracking-wider w-40">
                    Staff
                  </th>
                  {weekDays.map((d) => (
                    <th key={d.toISOString()} className="text-left px-2 py-2 font-medium text-text-muted uppercase tracking-wider min-w-[120px]">
                      <div>{DAY_LABELS[d.getDay()]}</div>
                      <div className="text-text-primary font-semibold">{d.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <StaffRow key={s.id} staff={s} weekDays={weekDays} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-text-muted mt-3">
        Edit weekly hours and date exceptions on the{" "}
        <Link href="/dashboard/staff/availability" className="underline">Availability</Link> page.
        Class staff assignments come from the class editor; event coverage comes from the event editor.
      </p>
    </div>
  );
}

function StaffRow({ staff, weekDays }: { staff: StaffSchedule; weekDays: Date[] }) {
  return (
    <tr className="border-b border-app-border last:border-0 align-top">
      <td className="sticky left-0 bg-surface px-3 py-3 w-40 border-r border-app-border">
        <p className="text-sm font-medium text-text-primary">
          {staff.firstName} {staff.lastName}
        </p>
        {staff.title && <p className="text-[11px] text-text-muted">{staff.title}</p>}
        <p className="text-[10px] text-text-muted">{staff.role === "OWNER" ? "Owner" : "Staff"}</p>
      </td>
      {weekDays.map((d) => (
        <DayCell key={d.toISOString()} staff={staff} day={d} />
      ))}
    </tr>
  );
}

function DayCell({ staff, day }: { staff: StaffSchedule; day: Date }) {
  const dow = day.getDay();
  const dateStr = toISODate(day);
  const slots = staff.availability.filter((a) => a.dayOfWeek === dow);
  const exception = staff.exceptions.find((e) => e.date === dateStr);
  const classes = staff.classes.filter((c) => c.date === dateStr);
  const events = staff.events.filter((e) => e.startsAt.slice(0, 10) === dateStr);

  const isUnavailable = exception?.type === "UNAVAILABLE";

  return (
    <td className="px-2 py-3 align-top">
      {isUnavailable ? (
        <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-1">
          Unavailable{exception?.note ? ` — ${exception.note}` : ""}
        </div>
      ) : (
        <>
          {/* Availability windows */}
          {slots.length > 0 && (
            <div className="mb-1.5 space-y-0.5">
              {slots.map((s, i) => (
                <div key={i} className="text-[10px] text-text-muted">
                  {s.startTime}–{s.endTime}
                </div>
              ))}
            </div>
          )}
          {exception?.type === "PARTIAL" && (
            <div className="text-[10px] text-orange-accent mb-1">
              Modified {exception.startTime}–{exception.endTime}
            </div>
          )}

          {/* Class assignments */}
          {classes.map((c, i) => (
            <div
              key={`c-${c.classId}-${i}`}
              className="mb-1 text-[11px] bg-brand/10 text-brand rounded px-1.5 py-1 leading-tight"
              title={c.name}
            >
              <p className="font-medium truncate">{c.name}</p>
              <p className="text-[9px] opacity-75">{c.startTime}–{c.endTime}</p>
            </div>
          ))}

          {/* Event assignments */}
          {events.map((e) => (
            <div
              key={e.id}
              className="mb-1 text-[11px] bg-orange-accent/10 text-orange-accent rounded px-1.5 py-1 leading-tight"
              title={e.name}
            >
              <p className="font-medium truncate">{e.name}</p>
              <p className="text-[9px] opacity-75">
                {new Date(e.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          ))}

          {/* Empty state */}
          {slots.length === 0 && classes.length === 0 && events.length === 0 && !exception && (
            <div className="text-[10px] text-text-muted opacity-50">Off</div>
          )}
        </>
      )}
    </td>
  );
}
