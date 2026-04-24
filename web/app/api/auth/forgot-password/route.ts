import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().email(), clubSlug: z.string() });

export async function POST(req: Request) {
  try {
    const { email, clubSlug } = schema.parse(await req.json());
    const club = await prisma.club.findUnique({ where: { slug: clubSlug } });
    if (!club) return NextResponse.json({ ok: true });

    const user = await prisma.user.findUnique({
      where: { clubId_email: { clubId: club.id, email: email.toLowerCase() } },
    });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 1000 * 60 * 60);
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetExpires },
      });
      // TODO: send email with link: /reset-password?token=${resetToken}
      console.log("Reset link token:", resetToken);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
