-- AlterTable: per-day time overrides on recurring classes
ALTER TABLE "recurring_classes" ADD COLUMN "dayOverrides" JSONB NOT NULL DEFAULT '[]';

-- AlterTable: membership trial rules
ALTER TABLE "memberships"
  ADD COLUMN "trialEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "trialDays" INTEGER,
  ADD COLUMN "trialAppliesToReturning" BOOLEAN NOT NULL DEFAULT false;
