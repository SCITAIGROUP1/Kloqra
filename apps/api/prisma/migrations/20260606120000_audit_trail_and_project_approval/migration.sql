-- AlterTable: project approval settings
ALTER TABLE "projects" ADD COLUMN "timesheet_approval_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "projects" ADD COLUMN "timesheet_approval_period" TEXT;

-- Timesheet periods: scope by project and rename period columns
DELETE FROM "timesheet_periods";

ALTER TABLE "timesheet_periods" DROP CONSTRAINT IF EXISTS "timesheet_periods_user_id_week_start_key";
DROP INDEX IF EXISTS "timesheet_periods_week_start_idx";
DROP INDEX IF EXISTS "timesheet_periods_user_id_week_start_key";

ALTER TABLE "timesheet_periods" RENAME COLUMN "week_start" TO "period_start";
ALTER TABLE "timesheet_periods" RENAME COLUMN "week_end" TO "period_end";

ALTER TABLE "timesheet_periods" ADD COLUMN "project_id" TEXT NOT NULL;

CREATE INDEX "timesheet_periods_period_start_idx" ON "timesheet_periods"("period_start");
CREATE INDEX "timesheet_periods_project_id_idx" ON "timesheet_periods"("project_id");
CREATE UNIQUE INDEX "timesheet_periods_user_id_project_id_period_start_key" ON "timesheet_periods"("user_id", "project_id", "period_start");

ALTER TABLE "timesheet_periods" ADD CONSTRAINT "timesheet_periods_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit trail for time log mutations
CREATE TABLE "time_log_audit_events" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "time_log_id" TEXT NOT NULL,
    "entry_user_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_log_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_log_audit_events_time_log_id_created_at_idx" ON "time_log_audit_events"("time_log_id", "created_at");
CREATE INDEX "time_log_audit_events_workspace_id_created_at_idx" ON "time_log_audit_events"("workspace_id", "created_at");
