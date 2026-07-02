import { InjectQueue } from "@nestjs/bullmq";
import { Body, Controller, Logger, Post } from "@nestjs/common";
import { TicketChannel, TicketType } from "@prisma/client";
import { Queue } from "bullmq";
import { QUEUES } from "../../../../common/queues";
import { IngestTicketJobPayload } from "../../workers/job-payloads";

@Controller("helpdesk/email-inbound")
export class HelpdeskEmailInboundController {
  private readonly logger = new Logger(HelpdeskEmailInboundController.name);

  constructor(@InjectQueue(QUEUES.HELPDESK_INGEST) private readonly ingestQueue: Queue) {}

  @Post()
  async handleIncomingEmail(@Body() payload: any) {
    this.logger.log(`Received inbound email webhook`);

    try {
      // Assuming a generic JSON webhook from Brevo/Postmark
      const subject = payload.Subject || "No Subject";
      const body = payload.TextBody || "No Content";
      const htmlBody = payload.HtmlBody || undefined;
      const requesterEmail = payload.FromFull?.Email || payload.From || "unknown@example.com";
      const requesterName = payload.FromFull?.Name || requesterEmail;
      const messageId = payload.MessageID || payload.MessageId;

      const jobPayload: IngestTicketJobPayload = {
        channel: TicketChannel.EMAIL,
        ticketType: TicketType.GENERAL,
        subject,
        body,
        htmlBody,
        requesterName,
        requesterEmail,
        emailMessageId: messageId
      };

      await this.ingestQueue.add("ingest", jobPayload);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to process inbound email: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
