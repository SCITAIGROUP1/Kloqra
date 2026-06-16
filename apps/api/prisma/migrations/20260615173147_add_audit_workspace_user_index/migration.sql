-- CreateIndex
CREATE INDEX "time_log_audit_events_workspace_id_entry_user_id_created_at_idx" ON "time_log_audit_events"("workspace_id", "entry_user_id", "created_at" DESC);
