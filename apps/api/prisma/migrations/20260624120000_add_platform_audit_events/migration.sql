-- CreateTable
CREATE TABLE "platform_audit_events" (
    "id" TEXT NOT NULL,
    "actor_platform_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tenant_id" TEXT,
    "summary" JSONB NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_audit_events_created_at_idx" ON "platform_audit_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_audit_events_tenant_id_created_at_idx" ON "platform_audit_events"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_audit_events_actor_platform_user_id_created_at_idx" ON "platform_audit_events"("actor_platform_user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_actor_platform_user_id_fkey" FOREIGN KEY ("actor_platform_user_id") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
