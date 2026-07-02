import { InjectQueue } from "@nestjs/bullmq";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TicketChannel } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { QUEUES } from "../../../../common/queues";
import { IngestTicketJobPayload } from "../../workers/job-payloads";
import { SubmitTicketDto } from "./dto/submit-ticket.dto";

@Controller()
export class HelpdeskTicketsController {
  constructor(
    @InjectQueue(QUEUES.HELPDESK_INGEST) private readonly ingestQueue: Queue,
    private readonly prisma: PrismaService
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
  async getTickets(
    @Query("page") page = "1",
    @Query("limit") limit = "25",
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("channel") channel?: string
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 25);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

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
      messages: ticket.messages
    };
  }

  @Patch("platform/helpdesk/tickets/:id")
  async updateTicket(@Param("id") id: string, @Body() body: any) {
    return { id, ...body };
  }
}
