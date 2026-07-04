-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'PARTIALLY_RETURNED', 'RETURNED', 'FORFEITED');

-- AlterTable
ALTER TABLE "leases" ADD COLUMN     "depositReturnedAmount" DECIMAL(12,2),
ADD COLUMN     "depositSettledAt" TIMESTAMP(3),
ADD COLUMN     "depositSettlementNote" TEXT,
ADD COLUMN     "depositStatus" "DepositStatus" NOT NULL DEFAULT 'HELD';
