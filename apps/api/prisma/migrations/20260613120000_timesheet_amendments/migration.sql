-- CreateTable
CREATE TABLE "timesheet_amendment_requests" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheet_amendment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timesheet_amendment_requests_workspace_id_status_idx" ON "timesheet_amendment_requests"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "timesheet_amendment_requests_period_id_status_idx" ON "timesheet_amendment_requests"("period_id", "status");

-- AddForeignKey
ALTER TABLE "timesheet_amendment_requests" ADD CONSTRAINT "timesheet_amendment_requests_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "timesheet_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_amendment_requests" ADD CONSTRAINT "timesheet_amendment_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
