import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
import { PlatformNotificationsRealtimeService } from "../../platform/application/platform-notifications-realtime.service";

export interface HelpdeskNotifyJob {
  type: "ticket_assigned" | "new_reply" | "sla_breach" | "status_changed";
  ticketId: string;
  recipientPlatformUserIds: string[];
  metadata: Record<string, unknown>;
}

@Processor(QUEUES.HELPDESK_NOTIFY)
export class HelpdeskNotifyWorker extends WorkerHost {
  private readonly logger = new Logger(HelpdeskNotifyWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeNotifyService: PlatformNotificationsRealtimeService
  ) {
    super();
  }

  async process(job: Job<HelpdeskNotifyJob, any, string>): Promise<any> {
    this.logger.log(`Processing notify job ${job.id} for ticket: ${job.data.ticketId}`);

    try {
      const { type, ticketId, recipientPlatformUserIds, metadata } = job.data;

      const titleMap = {
        ticket_assigned: "Ticket Assigned",
        new_reply: "New Reply on Ticket",
        sla_breach: "SLA Breach Alert",
        status_changed: "Ticket Status Changed"
      };

      for (const platformUserId of recipientPlatformUserIds) {
        const notification = await this.prisma.platformNotification.create({
          data: {
            platformUserId,
            type: `helpdesk_${type}`,
            title: titleMap[type],
            body: `Ticket #${metadata.ticketNumber}: ${metadata.subject}`,
            metadata: { ticketId, ...metadata }
          }
        });

        // Trigger real-time push
        this.realtimeNotifyService.publishNotificationCreated(platformUserId, {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            createdAt: notification.createdAt,
            metadata: notification.metadata as any
          },
          unreadCount: 1 // simplified
        });
      }

      this.logger.log(`Successfully processed notify job for ticket ${ticketId}`);
    } catch (error: any) {
      this.logger.error(`Failed to process notify job: ${error.message}`, error.stack);
      throw error;
    }
  }
}
