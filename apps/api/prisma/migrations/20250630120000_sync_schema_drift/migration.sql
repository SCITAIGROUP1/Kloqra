-- AlterEnum
ALTER TYPE "TimesheetStatus" ADD VALUE 'WAIVED';

-- DropIndex
DROP INDEX "categories_workspace_id_is_active_idx";

-- DropIndex
DROP INDEX "tasks_project_id_is_active_idx";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "is_active";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "timesheet_approval_enabled_at" TIMESTAMP(3),
ADD COLUMN "timesheet_approval_period_effective_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "is_active";

-- AlterTable
ALTER TABLE "timesheet_periods" ADD COLUMN "approval_period" TEXT;
