import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mode: z.enum(["create", "join"]),
  clubSlug: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    let clubId: string;
    let clubSlug: string;
    let role: "OWNER" | "MEMBER";

    if (data.mode === "create") {
      const tempSlug = `club-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const club = await prisma.club.create({
        data: { name: "My Club", slug: tempSlug },
      });
      clubId = club.id;
      clubSlug = club.slug;
      role = "OWNER";
    } else {
      if (!data.clubSlug) {
        return NextResponse.json({ error: "Club code required" }, { status: 400 });
      }
      const club = await prisma.club.findUnique({ where: { slug: data.clubSlug } });
      if (!club) {
        return NextResponse.json({ error: "Club not found" }, { status: 404 });
      }
      clubId = club.id;
      clubSlug = club.slug;
      role = "MEMBER";
    }

    const existing = await prisma.user.findUnique({
      where: { clubId_email: { clubId, email: data.email.toLowerCase() } },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        clubId,
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role,
      },
    });

    return NextResponse.json({ id: user.id, email: user.email, clubSlug }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
