-- CreateTable
CREATE TABLE "reporting_api_credentials" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "project_ids" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporting_api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reporting_api_credentials_api_key_key" ON "reporting_api_credentials"("api_key");

-- CreateIndex
CREATE INDEX "reporting_api_credentials_workspace_id_idx" ON "reporting_api_credentials"("workspace_id");

-- AddForeignKey
ALTER TABLE "reporting_api_credentials" ADD CONSTRAINT "reporting_api_credentials_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
