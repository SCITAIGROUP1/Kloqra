import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PlatformModule } from "../platform/platform.module";
import { QueuesModule } from "../queues/queues.module";
// Application Services
import { HelpdeskQueuesService } from "./application/helpdesk-queues.service";
import { HelpdeskSlaService } from "./application/helpdesk-sla.service";
import { HelpdeskStatsService } from "./application/helpdesk-stats.service";
import { HelpdeskTicketsService } from "./application/helpdesk-tickets.service";
// Interface / Controllers
import { HelpdeskEmailInboundController } from "./interface/http/helpdesk-email-inbound.controller";
import { HelpdeskQueuesController } from "./interface/http/helpdesk-queues.controller";
import { HelpdeskStatsController } from "./interface/http/helpdesk-stats.controller";
import { HelpdeskTicketsController } from "./interface/http/helpdesk-tickets.controller";
// Workers
import { HelpdeskGateway } from "./interface/ws/helpdesk.gateway";
import { HelpdeskIngestWorker } from "./workers/helpdesk-ingest.worker";
import { HelpdeskNotifyWorker } from "./workers/helpdesk-notify.worker";
import { HelpdeskReplyWorker } from "./workers/helpdesk-reply.worker";
import { HelpdeskSlaWorker } from "./workers/helpdesk-sla.worker";
// Gateway

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, PlatformModule, QueuesModule],
  controllers: [
    HelpdeskQueuesController,
    HelpdeskTicketsController,
    HelpdeskStatsController,
    HelpdeskEmailInboundController
  ],
  providers: [
    HelpdeskQueuesService,
    HelpdeskSlaService,
    HelpdeskStatsService,
    HelpdeskTicketsService,
    HelpdeskIngestWorker,
    HelpdeskNotifyWorker,
    HelpdeskReplyWorker,
    HelpdeskSlaWorker,
    HelpdeskGateway
  ],
  exports: [HelpdeskTicketsService]
})
export class HelpDeskModule {}
