-- Sync drift from pre-init databases. Idempotent for fresh installs where init already
-- includes WAIVED, approval columns, and categories/tasks without is_active.

-- AlterEnum (init may already define WAIVED)
DO $$ BEGIN
  ALTER TYPE "TimesheetStatus" ADD VALUE 'WAIVED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- DropIndex (legacy indexes; may not exist on fresh init)
DROP INDEX IF EXISTS "categories_workspace_id_is_active_idx";
DROP INDEX IF EXISTS "tasks_project_id_is_active_idx";

-- AlterTable (legacy columns; may not exist on fresh init)
ALTER TABLE "categories" DROP COLUMN IF EXISTS "is_active";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "is_active";

-- AlterTable (init may already define these columns)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "timesheet_approval_enabled_at" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "timesheet_approval_period_effective_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "timesheet_periods" ADD COLUMN IF NOT EXISTS "approval_period" TEXT;
