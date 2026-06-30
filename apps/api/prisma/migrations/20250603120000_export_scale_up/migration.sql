-- CreateTable
CREATE TABLE "export_presets" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_schedules" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "recipient_emails" TEXT[],
    "body" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "last_run_status" TEXT,
    "last_run_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_shares" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_presets_workspace_id_idx" ON "export_presets"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "export_presets_workspace_id_name_key" ON "export_presets"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "export_schedules_workspace_id_idx" ON "export_schedules"("workspace_id");

-- CreateIndex
CREATE INDEX "export_schedules_next_run_at_enabled_idx" ON "export_schedules"("next_run_at", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "report_shares_token_key" ON "report_shares"("token");

-- CreateIndex
CREATE INDEX "report_shares_workspace_id_idx" ON "report_shares"("workspace_id");

-- AddForeignKey
ALTER TABLE "export_presets" ADD CONSTRAINT "export_presets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_schedules" ADD CONSTRAINT "export_schedules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
