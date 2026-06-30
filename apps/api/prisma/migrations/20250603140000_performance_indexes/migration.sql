-- CreateIndex
CREATE INDEX "time_logs_start_time_idx" ON "time_logs"("start_time");

-- CreateIndex
CREATE INDEX "hourly_rates_workspace_id_effective_from_idx" ON "hourly_rates"("workspace_id", "effective_from");
