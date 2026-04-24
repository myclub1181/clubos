import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ token: z.string(), password: z.string().min(8) });

export async function POST(req: Request) {
  try {
    const { token, password } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetExpires || user.resetExpires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetExpires: null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Reset failed" }, { status: 400 });
  }
}
