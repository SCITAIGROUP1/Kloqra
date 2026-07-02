-- CreateEnum
CREATE TYPE "ticket_type" AS ENUM ('BUG_REPORT', 'BILLING', 'PLAN_QUESTION', 'FEATURE_REQUEST', 'IN_APP_REPORT', 'SECURITY', 'GENERAL');

-- AlterTable
ALTER TABLE "helpdesk_tickets" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "ticket_type" "ticket_type" NOT NULL DEFAULT 'GENERAL';
