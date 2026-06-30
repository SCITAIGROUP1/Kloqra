-- AlterEnum
ALTER TYPE "TimesheetStatus" ADD VALUE 'WAIVED';

-- AlterTable
ALTER TABLE "projects"
  ADD COLUMN "timesheet_approval_enabled_at" TIMESTAMP(3),
  ADD COLUMN "timesheet_approval_period_effective_at" TIMESTAMP(3);

ALTER TABLE "timesheet_periods"
  ADD COLUMN "approval_period" TEXT;

-- Backfill approval enabled timestamp for existing projects
UPDATE "projects"
SET "timesheet_approval_enabled_at" = "created_at"
WHERE "timesheet_approval_enabled" = true
  AND "timesheet_approval_enabled_at" IS NULL;

-- Snapshot weekly approval period on existing periods where project had weekly setting
UPDATE "timesheet_periods" tp
SET "approval_period" = p."timesheet_approval_period"
FROM "projects" p
WHERE tp."project_id" = p."id"
  AND tp."approval_period" IS NULL
  AND p."timesheet_approval_period" IN ('daily', 'weekly', 'monthly');

UPDATE "timesheet_periods" tp
SET "approval_period" = 'weekly'
FROM "projects" p
WHERE tp."project_id" = p."id"
  AND tp."approval_period" IS NULL
  AND p."timesheet_approval_enabled" = true;
