-- CreateTable
CREATE TABLE "widget_shares" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "widget_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "widget_shares_token_key" ON "widget_shares"("token");

-- CreateIndex
CREATE INDEX "widget_shares_workspace_id_idx" ON "widget_shares"("workspace_id");

-- AddForeignKey
ALTER TABLE "widget_shares" ADD CONSTRAINT "widget_shares_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
