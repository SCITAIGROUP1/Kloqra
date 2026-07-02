import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "../../../common/queues";
import { HelpdeskTicketsService } from "../application/helpdesk-tickets.service";
import { IngestTicketJobPayload } from "./job-payloads";
// import { HelpdeskGateway } from "../gateway/helpdesk.gateway";

@Processor(QUEUES.HELPDESK_INGEST)
export class HelpdeskIngestWorker extends WorkerHost {
  private readonly logger = new Logger(HelpdeskIngestWorker.name);

  constructor(
    private readonly ticketsService: HelpdeskTicketsService
    // private readonly gateway: HelpdeskGateway
  ) {
    super();
  }

  async process(job: Job<IngestTicketJobPayload, any, string>): Promise<any> {
    this.logger.log(`Processing ingest job ${job.id} for subject: ${job.data.subject}`);

    try {
      const ticket = await this.ticketsService.createFromIngest(job.data);

      // TODO: emit gateway event when gateway is implemented
      // this.gateway.emitTicketCreated(ticket);

      this.logger.log(`Successfully ingested ticket ${ticket.ticketNumber}`);
      return { ticketId: ticket.id, ticketNumber: ticket.ticketNumber };
    } catch (error: any) {
      this.logger.error(`Failed to ingest ticket: ${error.message}`, error.stack);
      throw error; // Will trigger BullMQ retry
    }
  }
}
