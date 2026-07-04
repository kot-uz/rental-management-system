-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RENT_DUE' BEFORE 'RENT_OVERDUE';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "telegram_link_tokens" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_reminder_logs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "rentPeriodId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_tokens_token_key" ON "telegram_link_tokens"("token");

-- CreateIndex
CREATE INDEX "telegram_link_tokens_orgId_subjectType_subjectId_idx" ON "telegram_link_tokens"("orgId", "subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "rent_reminder_logs_orgId_rentPeriodId_idx" ON "rent_reminder_logs"("orgId", "rentPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "rent_reminder_logs_rentPeriodId_phase_target_key" ON "rent_reminder_logs"("rentPeriodId", "phase", "target");
