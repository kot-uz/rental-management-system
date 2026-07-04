-- CreateTable
CREATE TABLE "locked_periods" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedByUserId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "unlockedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locked_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locked_periods_orgId_unlockedAt_idx" ON "locked_periods"("orgId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "locked_periods_orgId_yearMonth_key" ON "locked_periods"("orgId", "yearMonth");

-- AddForeignKey
ALTER TABLE "locked_periods" ADD CONSTRAINT "locked_periods_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
