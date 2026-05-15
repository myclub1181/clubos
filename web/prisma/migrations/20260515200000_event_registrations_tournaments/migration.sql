-- AlterTable: Event tournament mode + public registration + variable cost
ALTER TABLE "events"
  ADD COLUMN "tournamentMode" TEXT,
  ADD COLUMN "registrationForm" JSONB,
  ADD COLUMN "publicRegistration" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publicSlug" TEXT,
  ADD COLUMN "publicFormIntro" TEXT,
  ADD COLUMN "variableCostEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "variableCostMode" TEXT,
  ADD COLUMN "variableCostTotal" DECIMAL(10,2),
  ADD COLUMN "variableCostEstimatedSignups" INTEGER,
  ADD COLUMN "variableCostBilledAt" TIMESTAMP(3);

-- Unique public slug
CREATE UNIQUE INDEX "events_publicSlug_key" ON "events"("publicSlug");

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "formResponses" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "amountDue" DECIMAL(10,2),
    "amountPaid" DECIMAL(10,2),
    "paymentUrl" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_registrations_eventId_idx" ON "event_registrations"("eventId");
CREATE INDEX "event_registrations_clubId_idx" ON "event_registrations"("clubId");
CREATE INDEX "event_registrations_memberId_idx" ON "event_registrations"("memberId");

ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
