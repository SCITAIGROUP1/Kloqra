-- AlterTable
ALTER TABLE "platform_users" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "platform_notifications" (
    "id" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_notifications_platform_user_id_created_at_idx" ON "platform_notifications"("platform_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_notifications_platform_user_id_read_at_idx" ON "platform_notifications"("platform_user_id", "read_at");

-- AddForeignKey
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
