-- AlterTable
ALTER TABLE "repairs" ADD COLUMN     "contractorId" TEXT;

-- CreateTable
CREATE TABLE "contractors" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "specialty" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contractors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contractors_orgId_deletedAt_idx" ON "contractors"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "repairs_contractorId_idx" ON "repairs"("contractorId");

-- AddForeignKey
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
