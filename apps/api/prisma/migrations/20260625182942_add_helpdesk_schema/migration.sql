-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketChannel" AS ENUM ('WEB_FORM', 'EMAIL', 'PLATFORM_ADMIN', 'API');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateTable
CREATE TABLE "helpdesk_queues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "sla_policy" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helpdesk_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_agents" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "helpdesk_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" SERIAL NOT NULL,
    "queue_id" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "channel" "TicketChannel" NOT NULL DEFAULT 'WEB_FORM',
    "subject" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "tenant_id" TEXT,
    "assigned_to_id" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "first_response_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "sla_breached" BOOLEAN NOT NULL DEFAULT false,
    "first_response_due" TIMESTAMP(3),
    "resolution_due" TIMESTAMP(3),
    "internal_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helpdesk_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "html_body" TEXT,
    "email_message_id" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "helpdesk_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_ticket_history" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "helpdesk_ticket_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_queues_name_key" ON "helpdesk_queues"("name");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_queues_slug_key" ON "helpdesk_queues"("slug");

-- CreateIndex
CREATE INDEX "helpdesk_agents_platform_user_id_idx" ON "helpdesk_agents"("platform_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_agents_queue_id_platform_user_id_key" ON "helpdesk_agents"("queue_id", "platform_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_tickets_ticket_number_key" ON "helpdesk_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_queue_id_status_idx" ON "helpdesk_tickets"("queue_id", "status");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_assigned_to_id_status_idx" ON "helpdesk_tickets"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_tenant_id_idx" ON "helpdesk_tickets"("tenant_id");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_status_created_at_idx" ON "helpdesk_tickets"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "helpdesk_tickets_requester_email_idx" ON "helpdesk_tickets"("requester_email");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_sla_breached_status_idx" ON "helpdesk_tickets"("sla_breached", "status");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_ticket_messages_email_message_id_key" ON "helpdesk_ticket_messages"("email_message_id");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_messages_ticket_id_created_at_idx" ON "helpdesk_ticket_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_history_ticket_id_created_at_idx" ON "helpdesk_ticket_history"("ticket_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "helpdesk_agents" ADD CONSTRAINT "helpdesk_agents_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "helpdesk_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_agents" ADD CONSTRAINT "helpdesk_agents_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "helpdesk_queues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_messages" ADD CONSTRAINT "helpdesk_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_messages" ADD CONSTRAINT "helpdesk_ticket_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_history" ADD CONSTRAINT "helpdesk_ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
