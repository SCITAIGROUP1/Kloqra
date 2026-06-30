-- Create default fallback partitions (safety net)
CREATE TABLE IF NOT EXISTS "time_logs_default" PARTITION OF "time_logs" DEFAULT;
CREATE TABLE IF NOT EXISTS "time_log_audit_events_default" PARTITION OF "time_log_audit_events" DEFAULT;