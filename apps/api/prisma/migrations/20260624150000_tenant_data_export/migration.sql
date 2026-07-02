-- F23: tenant data export jobs + churn timestamp for hard-delete retention

CREATE TABLE "tenant_data_export_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filename" TEXT,
    "content_type" TEXT,
    "byte_size" INTEGER,
    "storage_key" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "tenant_data_export_jobs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tenants" ADD COLUMN "churned_at" TIMESTAMP(3);

CREATE INDEX "tenant_data_export_jobs_tenant_id_created_at_idx" ON "tenant_data_export_jobs"("tenant_id", "created_at" DESC);
CREATE INDEX "tenant_data_export_jobs_status_created_at_idx" ON "tenant_data_export_jobs"("status", "created_at");

ALTER TABLE "tenant_data_export_jobs" ADD CONSTRAINT "tenant_data_export_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_data_export_jobs" ADD CONSTRAINT "tenant_data_export_jobs_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
