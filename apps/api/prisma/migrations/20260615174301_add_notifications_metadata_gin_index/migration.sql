-- CreateIndex
CREATE INDEX "notifications_metadata_idx" ON "notifications" USING GIN ("metadata");
