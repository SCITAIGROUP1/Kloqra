-- Drop existing tables if they exist
DROP TABLE IF EXISTS "time_logs" CASCADE;
DROP TABLE IF EXISTS "time_log_audit_events" CASCADE;

-- Create partitioned tables
CREATE TABLE "time_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "description" TEXT,
    "is_billable" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "time_logs_pkey" PRIMARY KEY ("id", "start_time")
) PARTITION BY RANGE ("start_time");

-- Source check constraint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_log_source_check" CHECK ("source" IN ('manual', 'timer', 'timer_autostopped'));

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
    CONSTRAINT "time_log_audit_events_pkey" PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

-- Create partitions for 2025 and 2026
CREATE TABLE "time_logs_y2025" PARTITION OF "time_logs"
  FOR VALUES FROM ('2025-01-01 00:00:00') TO ('2026-01-01 00:00:00');

CREATE TABLE "time_logs_y2026m01" PARTITION OF "time_logs" FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2026-02-01 00:00:00');
CREATE TABLE "time_logs_y2026m02" PARTITION OF "time_logs" FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-03-01 00:00:00');
CREATE TABLE "time_logs_y2026m03" PARTITION OF "time_logs" FOR VALUES FROM ('2026-03-01 00:00:00') TO ('2026-04-01 00:00:00');
CREATE TABLE "time_logs_y2026m04" PARTITION OF "time_logs" FOR VALUES FROM ('2026-04-01 00:00:00') TO ('2026-05-01 00:00:00');
CREATE TABLE "time_logs_y2026m05" PARTITION OF "time_logs" FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');
CREATE TABLE "time_logs_y2026m06" PARTITION OF "time_logs" FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');
CREATE TABLE "time_logs_y2026m07" PARTITION OF "time_logs" FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-08-01 00:00:00');
CREATE TABLE "time_logs_y2026m08" PARTITION OF "time_logs" FOR VALUES FROM ('2026-08-01 00:00:00') TO ('2026-09-01 00:00:00');
CREATE TABLE "time_logs_y2026m09" PARTITION OF "time_logs" FOR VALUES FROM ('2026-09-01 00:00:00') TO ('2026-10-01 00:00:00');
CREATE TABLE "time_logs_y2026m10" PARTITION OF "time_logs" FOR VALUES FROM ('2026-10-01 00:00:00') TO ('2026-11-01 00:00:00');
CREATE TABLE "time_logs_y2026m11" PARTITION OF "time_logs" FOR VALUES FROM ('2026-11-01 00:00:00') TO ('2026-12-01 00:00:00');
CREATE TABLE "time_logs_y2026m12" PARTITION OF "time_logs" FOR VALUES FROM ('2026-12-01 00:00:00') TO ('2027-01-01 00:00:00');

CREATE TABLE "time_log_audit_events_y2025" PARTITION OF "time_log_audit_events"
  FOR VALUES FROM ('2025-01-01 00:00:00') TO ('2026-01-01 00:00:00');
CREATE TABLE "time_log_audit_events_y2026" PARTITION OF "time_log_audit_events"
  FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2027-01-01 00:00:00');

-- Add foreign keys to the new partitioned tables
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes to the new partitioned tables
CREATE INDEX "time_logs_user_id_start_time_idx" ON "time_logs"("user_id", "start_time");
CREATE INDEX "time_logs_task_id_start_time_idx" ON "time_logs"("task_id", "start_time");
CREATE INDEX "time_logs_start_time_idx" ON "time_logs"("start_time");

CREATE INDEX "time_log_audit_events_time_log_id_created_at_idx" ON "time_log_audit_events"("time_log_id", "created_at");
CREATE INDEX "time_log_audit_events_workspace_id_created_at_idx" ON "time_log_audit_events"("workspace_id", "created_at");
CREATE INDEX "time_log_audit_events_workspace_id_entry_user_id_created_at_idx" ON "time_log_audit_events"("workspace_id", "entry_user_id", "created_at" DESC);
