import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { clubId: session.user.clubId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json(memberships);
}

const optionSchema = z.object({
  label: z.string().min(1),
  price: z.number().min(0),
  period: z.string().min(1),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  options: z.array(optionSchema).min(1),
  active: z.boolean().default(true),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const membership = await prisma.membership.create({
      data: {
        clubId: session.user.clubId,
        name: data.name,
        description: data.description || null,
        options: JSON.stringify(data.options),
        active: data.active,
      },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
