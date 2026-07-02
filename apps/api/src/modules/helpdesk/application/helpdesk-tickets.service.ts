import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Prisma, MessageDirection, TicketType } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
import { IngestTicketJobPayload } from "../workers/job-payloads";
import {
  TICKET_TYPE_QUEUE,
  TICKET_TYPE_SLA_MINUTES,
  resolveTicketPriority
} from "./helpdesk-routing";
import { HelpdeskSlaService } from "./helpdesk-sla.service";

@Injectable()
export class HelpdeskTicketsService {
  private readonly logger = new Logger(HelpdeskTicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slaService: HelpdeskSlaService,
    @InjectQueue(QUEUES.HELPDESK_SLA) private readonly slaQueue: Queue,
    @InjectQueue(QUEUES.HELPDESK_NOTIFY) private readonly notifyQueue: Queue
  ) {}

  async createFromIngest(payload: IngestTicketJobPayload) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Determine ticket type (default GENERAL)
      const ticketType: TicketType = payload.ticketType ?? TicketType.GENERAL;

      // 2. Find target queue by type → slug, fall back to suggestedQueueSlug, then first queue
      const preferredSlug = payload.suggestedQueueSlug ?? TICKET_TYPE_QUEUE[ticketType];

      let queue = null;
      if (preferredSlug) {
        queue = await tx.helpDeskQueue.findUnique({
          where: { slug: preferredSlug }
        });
      }
      // Fallback: first available queue
      if (!queue) {
        queue = await tx.helpDeskQueue.findFirst({
          orderBy: { sortOrder: "asc" }
        });
      }
      if (!queue) {
        throw new Error("No HelpDesk queues configured in the system.");
      }

      // 3. Resolve priority (type-default + metadata-based escalation)
      const priority = resolveTicketPriority(
        ticketType,
        payload.metadata,
        payload.explicitPriority
      );

      // 4. Auto-assign (least-loaded agent in that queue)
      const agents = await tx.helpDeskAgent.findMany({
        where: { queueId: queue.id, isActive: true },
        select: { platformUserId: true }
      });
      let assignedToId: string | null = null;
      if (agents.length > 0) {
        const agentStats = await tx.helpDeskTicket.groupBy({
          by: ["assignedToId"],
          where: {
            assignedToId: { in: agents.map((a) => a.platformUserId) },
            status: { in: ["OPEN", "IN_PROGRESS"] }
          },
          _count: { id: true }
        });
        let minCount = Infinity;
        for (const agent of agents) {
          const stat = agentStats.find((s) => s.assignedToId === agent.platformUserId);
          const count = stat ? stat._count.id : 0;
          if (count < minCount) {
            minCount = count;
            assignedToId = agent.platformUserId;
          }
        }
      }

      // 5. Compute SLA deadlines — per-type SLA takes precedence over queue-level
      const now = new Date();
      const typeSla = TICKET_TYPE_SLA_MINUTES[ticketType];
      const queuePolicy = queue.slaPolicy as any;

      const firstResponseMinutes =
        typeSla?.firstResponseMinutes ?? queuePolicy?.firstResponseMinutes ?? null;
      const resolutionMinutes =
        typeSla?.resolutionMinutes ?? queuePolicy?.resolutionMinutes ?? null;

      const firstResponseDue = firstResponseMinutes
        ? new Date(now.getTime() + firstResponseMinutes * 60_000)
        : null;
      const resolutionDue = resolutionMinutes
        ? new Date(now.getTime() + resolutionMinutes * 60_000)
        : null;

      // 6. Create ticket
      const ticket = await tx.helpDeskTicket.create({
        data: {
          queueId: queue.id,
          assignedToId,
          subject: payload.subject,
          requesterName: payload.requesterName,
          requesterEmail: payload.requesterEmail,
          channel: payload.channel,
          ticketType,
          priority,
          tenantId: payload.tenantId ?? null,
          metadata: payload.metadata ? (payload.metadata as Prisma.InputJsonValue) : undefined,
          firstResponseDue,
          resolutionDue,
          messages: {
            create: {
              direction: MessageDirection.INBOUND,
              authorName: payload.requesterName,
              authorEmail: payload.requesterEmail,
              body: payload.body,
              htmlBody: payload.htmlBody,
              emailMessageId: payload.emailMessageId,
              attachments: payload.attachments || []
            }
          },
          history: {
            create: {
              actorName: "System (Ingest)",
              action: "ticket_created",
              after: {
                channel: payload.channel,
                ticketType,
                priority,
                queueId: queue.id,
                queueSlug: queue.slug
              }
            }
          }
        }
      });

      // 7. Enqueue SLA delayed jobs
      if (firstResponseDue) {
        const delay = Math.max(0, firstResponseDue.getTime() - now.getTime());
        await this.slaQueue.add(
          "check-sla",
          { ticketId: ticket.id, checkType: "first_response" },
          { jobId: `sla:${ticket.id}:first_response`, delay }
        );
      }
      if (resolutionDue) {
        const delay = Math.max(0, resolutionDue.getTime() - now.getTime());
        await this.slaQueue.add(
          "check-sla",
          { ticketId: ticket.id, checkType: "resolution" },
          { jobId: `sla:${ticket.id}:resolution`, delay }
        );
      }

      // 8. Notify assigned agent in real-time
      if (assignedToId) {
        await this.notifyQueue.add("notify", {
          type: "ticket_assigned",
          ticketId: ticket.id,
          recipientPlatformUserIds: [assignedToId],
          metadata: {
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            ticketType,
            priority
          }
        });
      }

      this.logger.log(
        `Ticket #${ticket.ticketNumber} created — type=${ticketType} priority=${priority} queue=${queue.slug}`
      );

      return ticket;
    });
  }
}
