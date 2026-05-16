-- StaffCompensation
CREATE TABLE "staff_compensations" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseType" TEXT NOT NULL DEFAULT 'HOURLY',
    "baseAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "staff_compensations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "staff_compensations_userId_key" ON "staff_compensations"("userId");
CREATE INDEX "staff_compensations_clubId_idx" ON "staff_compensations"("clubId");
ALTER TABLE "staff_compensations" ADD CONSTRAINT "staff_compensations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_compensations" ADD CONSTRAINT "staff_compensations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompensationBonus
CREATE TABLE "compensation_bonuses" (
    "id" TEXT NOT NULL,
    "compensationId" TEXT NOT NULL,
    "bonusType" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compensation_bonuses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "compensation_bonuses_compensationId_idx" ON "compensation_bonuses"("compensationId");
ALTER TABLE "compensation_bonuses" ADD CONSTRAINT "compensation_bonuses_compensationId_fkey" FOREIGN KEY ("compensationId") REFERENCES "staff_compensations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompensationAssignment
CREATE TABLE "compensation_assignments" (
    "id" TEXT NOT NULL,
    "compensationId" TEXT NOT NULL,
    "bonusId" TEXT,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    CONSTRAINT "compensation_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "compensation_assignments_compensationId_idx" ON "compensation_assignments"("compensationId");
CREATE INDEX "compensation_assignments_bonusId_idx" ON "compensation_assignments"("bonusId");
CREATE INDEX "compensation_assignments_scopeType_scopeId_idx" ON "compensation_assignments"("scopeType", "scopeId");
ALTER TABLE "compensation_assignments" ADD CONSTRAINT "compensation_assignments_compensationId_fkey" FOREIGN KEY ("compensationId") REFERENCES "staff_compensations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compensation_assignments" ADD CONSTRAINT "compensation_assignments_bonusId_fkey" FOREIGN KEY ("bonusId") REFERENCES "compensation_bonuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
