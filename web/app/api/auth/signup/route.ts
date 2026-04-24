import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  clubSlug: z.string().min(1),
  role: z.enum(["OWNER", "STAFF", "MEMBER"]).default("MEMBER"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const club = await prisma.club.findUnique({ where: { slug: data.clubSlug } });
    if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

    const existing = await prisma.user.findUnique({
      where: { clubId_email: { clubId: club.id, email: data.email.toLowerCase() } },
    });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        clubId: club.id,
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
