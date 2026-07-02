import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";

export interface SlaCheckJob {
  ticketId: string;
  checkType: "first_response" | "resolution";
}

@Processor(QUEUES.HELPDESK_SLA)
export class HelpdeskSlaWorker extends WorkerHost {
  private readonly logger = new Logger(HelpdeskSlaWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<SlaCheckJob, any, string>): Promise<any> {
    this.logger.log(`Processing SLA job ${job.id} for ticket: ${job.data.ticketId}`);

    try {
      const { ticketId, checkType } = job.data;

      const ticket = await this.prisma.helpDeskTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) return;
      if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
        this.logger.log(`Ticket ${ticketId} is already resolved/closed. Ignoring SLA check.`);
        return;
      }

      let breached = false;
      if (checkType === "first_response" && !ticket.firstResponseAt) {
        breached = true;
      } else if (checkType === "resolution" && !ticket.resolvedAt) {
        breached = true;
      }

      if (breached) {
        await this.prisma.$transaction([
          this.prisma.helpDeskTicket.update({
            where: { id: ticketId },
            data: { slaBreached: true }
          }),
          this.prisma.helpDeskTicketHistory.create({
            data: {
              ticketId,
              actorName: "System (SLA)",
              action: `sla_breached_${checkType}`
            }
          })
        ]);

        // TODO: Enqueue notify job
        this.logger.warn(`SLA BREACH on ticket ${ticketId} for ${checkType}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process SLA job: ${error.message}`, error.stack);
      throw error;
    }
  }
}
