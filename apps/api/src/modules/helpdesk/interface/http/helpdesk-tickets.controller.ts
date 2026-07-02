import { PlatformNotificationType } from "@kloqra/contracts";
import { InjectQueue } from "@nestjs/bullmq";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TicketChannel } from "@prisma/client";
import { Queue } from "bullmq";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformGuard } from "../../../../common/guards/platform.guard";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { QUEUES } from "../../../../common/queues";
import { PlatformNotificationsService } from "../../../platform/application/platform-notifications.service";
import { IngestTicketJobPayload } from "../../workers/job-payloads";
import { HelpdeskGateway } from "../ws/helpdesk.gateway";
import { SubmitTicketDto } from "./dto/submit-ticket.dto";

@Controller()
export class HelpdeskTicketsController {
  constructor(
    @InjectQueue(QUEUES.HELPDESK_INGEST) private readonly ingestQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly notificationsService: PlatformNotificationsService,
    private readonly gateway: HelpdeskGateway
  ) {}

  @Post("helpdesk/tickets/submit")
  async submitTicket(@Body() dto: SubmitTicketDto) {
    const payload: IngestTicketJobPayload = {
      channel: TicketChannel.WEB_FORM,
      ticketType: dto.ticketType,
      subject: dto.subject,
      body: dto.body,
      requesterName: dto.requesterName,
      requesterEmail: dto.requesterEmail,
      tenantId: dto.tenantId,
      metadata: dto.metadata
    };

    const job = await this.ingestQueue.add("ingest", payload);

    return {
      message: "Ticket submitted successfully. We will be in touch shortly.",
      jobId: job.id
    };
  }

  @Get("platform/helpdesk/tickets")
  @UseGuards(PlatformGuard)
  async getTickets(
    @Query("page") page = "1",
    @Query("limit") limit = "25",
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("channel") channel?: string,
    @Query("assignee") assignee?: string,
    @CurrentPlatformUser() user?: PlatformRequestUser
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 25);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (assignee === "ASSIGNED_TO_ME" && user) {
      where.assignedToId = user.platformUserId;
    } else if (assignee === "UNASSIGNED") {
      where.assignedToId = null;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { requesterName: { contains: search, mode: "insensitive" } }
      ];
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (channel && channel !== "ALL") {
      where.channel = channel;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.helpDeskTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          queue: true,
          assignedTo: true
        }
      }),
      this.prisma.helpDeskTicket.count({ where })
    ]);

    const data = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      channel: t.channel,
      requesterName: t.requesterName,
      requesterEmail: t.requesterEmail,
      queueName: t.queue.name,
      assignedToName: t.assignedTo?.name,
      slaBreached: t.slaBreached,
      firstResponseDue: t.firstResponseDue,
      resolutionDue: t.resolutionDue,
      createdAt: t.createdAt,
      ticketType: t.ticketType
    }));

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    };
  }

  @Get("platform/helpdesk/tickets/:id")
  @UseGuards(PlatformGuard)
  async getTicket(@Param("id") id: string) {
    const ticket = await this.prisma.helpDeskTicket.findUnique({
      where: { id },
      include: {
        queue: true,
        assignedTo: true,
        messages: { orderBy: { createdAt: "asc" } }
      }
    });
    if (!ticket) {
      return null;
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      channel: ticket.channel,
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
      queueName: ticket.queue.name,
      assignedToName: ticket.assignedTo?.name,
      slaBreached: ticket.slaBreached,
      firstResponseDue: ticket.firstResponseDue,
      resolutionDue: ticket.resolutionDue,
      createdAt: ticket.createdAt,
      ticketType: ticket.ticketType,
      metadata: ticket.metadata,
      messages: ticket.messages.map((msg) => ({
        id: msg.id,
        senderType: msg.direction === "INBOUND" ? "USER" : "AGENT",
        senderName: msg.direction === "INBOUND" ? ticket.requesterName : msg.authorName,
        body: msg.body,
        createdAt: msg.createdAt,
        direction: msg.direction
      }))
    };
  }

  @Patch("platform/helpdesk/tickets/:id")
  @UseGuards(PlatformGuard)
  async updateTicket(
    @Param("id") id: string,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Body() body: any
  ) {
    const ticket = await this.prisma.helpDeskTicket.findUnique({
      where: { id },
      select: { assignedToId: true, ticketNumber: true, subject: true, status: true }
    });
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const data: any = {};
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "RESOLVED") {
        data.resolvedAt = new Date();
      } else {
        data.resolvedAt = null;
      }
    }
    if (body.assignedToId !== undefined) {
      data.assignedToId = body.assignedToId || null;
    }

    const updated = await this.prisma.helpDeskTicket.update({
      where: { id },
      data,
      include: {
        queue: true,
        assignedTo: true
      }
    });

    let agent: { name: string | null } | null = null;
    const getAgent = async () => {
      if (!agent) {
        agent = await this.prisma.platformUser.findUnique({
          where: { id: user.platformUserId },
          select: { name: true }
        });
      }
      return agent;
    };

    if (body.assignedToId && body.assignedToId !== ticket.assignedToId) {
      const activeAgent = await getAgent();
      await this.notificationsService.createInApp({
        platformUserId: body.assignedToId,
        type: PlatformNotificationType.TICKET_ASSIGNED,
        title: "Ticket Assigned",
        body: `${activeAgent?.name || "An operator"} assigned you to Ticket #${ticket.ticketNumber}: "${ticket.subject}"`,
        metadata: {
          ticketId: id
        }
      });
    }

    if (body.status !== undefined && body.status !== ticket.status && ticket.assignedToId) {
      if (ticket.assignedToId !== user.platformUserId) {
        const activeAgent = await getAgent();
        await this.notificationsService.createInApp({
          platformUserId: ticket.assignedToId,
          type: PlatformNotificationType.TICKET_STATUS_CHANGED,
          title: "Ticket Status Updated",
          body: `${activeAgent?.name || "An operator"} updated the status of Ticket #${ticket.ticketNumber} ("${ticket.subject}") to "${body.status}"`,
          metadata: {
            ticketId: id
          }
        });
      }
    }

    return {
      id: updated.id,
      status: updated.status,
      assignedToName: updated.assignedTo?.name,
      assignedToId: updated.assignedToId,
      resolvedAt: updated.resolvedAt,
      success: true
    };
  }

  @Post("platform/helpdesk/tickets/:id/messages")
  @UseGuards(PlatformGuard)
  async createMessage(
    @Param("id") ticketId: string,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Body() body: { body: string; direction: "OUTBOUND" | "INTERNAL" }
  ) {
    const ticket = await this.prisma.helpDeskTicket.findUnique({
      where: { id: ticketId }
    });
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const agent = await this.prisma.platformUser.findUnique({
      where: { id: user.platformUserId }
    });
    if (!agent) {
      throw new Error("Agent not found");
    }

    const message = await this.prisma.helpDeskTicketMessage.create({
      data: {
        ticketId,
        body: body.body,
        direction: body.direction,
        authorId: user.platformUserId,
        authorName: agent.name || "Agent",
        authorEmail: agent.email || "agent@kloqra.com"
      }
    });

    const mappedMessage = {
      id: message.id,
      senderType: "AGENT" as const,
      senderName: message.authorName,
      body: message.body,
      createdAt: message.createdAt,
      direction: message.direction
    };

    this.gateway.emitNewMessage(ticketId, mappedMessage);

    if (body.direction === "INTERNAL") {
      const activeUsers = await this.prisma.platformUser.findMany({
        where: { isActive: true }
      });
      for (const mentionedUser of activeUsers) {
        if (!mentionedUser.name) continue;
        const escapedName = mentionedUser.name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`@${escapedName}\\b`, "i");
        if (regex.test(body.body)) {
          await this.notificationsService.createInApp({
            platformUserId: mentionedUser.id,
            type: PlatformNotificationType.TICKET_MENTION,
            title: "Ticket Mention",
            body: `${agent.name} mentioned you in an internal note for Ticket #${ticket.ticketNumber}: "${ticket.subject}"`,
            metadata: {
              ticketId,
              messageId: message.id
            }
          });
        }
      }
    }

    return {
      success: true,
      message: mappedMessage
    };
  }
}
