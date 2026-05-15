import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/stripe/diagnostics
// Owner-only. Returns webhook health + setup checklist + recent events for the
// diagnostics page. Used to verify Stripe is wired correctly in production.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    select: {
      id: true,
      tier: true,
      stripeAccountId: true,
      stripeOnboardingComplete: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
    },
  });

  // Surface only events relevant to this club + recent platform events. We
  // also include events with clubId=null so the owner can see incoming events
  // that haven't yet been associated.
  const recentEvents = await prisma.stripeWebhookEvent.findMany({
    where: {
      OR: [
        { clubId: session.user.clubId },
        { clubId: null },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      stripeEventId: true,
      type: true,
      source: true,
      livemode: true,
      processed: true,
      errorMessage: true,
      createdAt: true,
      processedAt: true,
    },
  });

  const env = {
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
    secretKeySet: !!process.env.STRIPE_SECRET_KEY,
    priceGrowthSet: !!process.env.STRIPE_PRICE_GROWTH,
    pricePro: !!process.env.STRIPE_PRICE_PRO,
    priceEnterprise: !!process.env.STRIPE_PRICE_ENTERPRISE,
    nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
  };

  const counts = {
    last24h: await prisma.stripeWebhookEvent.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    last24hErrors: await prisma.stripeWebhookEvent.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        errorMessage: { not: null },
      },
    }),
    total: await prisma.stripeWebhookEvent.count(),
  };

  return NextResponse.json({ club, env, counts, recentEvents });
}
