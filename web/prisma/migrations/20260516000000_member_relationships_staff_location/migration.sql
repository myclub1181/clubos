-- Location GPS
ALTER TABLE "locations" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "locations" ADD COLUMN "longitude" DOUBLE PRECISION;

-- Staff per-session rate
ALTER TABLE "staff_profiles" ADD COLUMN "perSessionRate" DECIMAL(10,2);

-- Event estimated total (display-only, OFFICIAL mode)
ALTER TABLE "events" ADD COLUMN "variableCostEstimatedTotal" DECIMAL(10,2);

-- Member relationships
CREATE TABLE "member_relationships" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "relatedMemberId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_relationships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "member_relationships_memberId_relatedMemberId_key" ON "member_relationships"("memberId", "relatedMemberId");
CREATE INDEX "member_relationships_clubId_idx" ON "member_relationships"("clubId");
CREATE INDEX "member_relationships_memberId_idx" ON "member_relationships"("memberId");
CREATE INDEX "member_relationships_relatedMemberId_idx" ON "member_relationships"("relatedMemberId");
ALTER TABLE "member_relationships" ADD CONSTRAINT "member_relationships_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_relationships" ADD CONSTRAINT "member_relationships_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_relationships" ADD CONSTRAINT "member_relationships_relatedMemberId_fkey" FOREIGN KEY ("relatedMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
