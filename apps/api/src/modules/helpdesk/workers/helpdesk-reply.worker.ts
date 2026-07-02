import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { MailerService } from "../../../common/mailer/mailer.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";

export interface ReplyEmailJob {
  ticketId: string;
  messageId: string;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  htmlBody: string;
  replyToMessageId?: string;
}

@Processor(QUEUES.HELPDESK_REPLY)
export class HelpdeskReplyWorker extends WorkerHost {
  private readonly logger = new Logger(HelpdeskReplyWorker.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService
  ) {
    super();
  }

  async process(job: Job<ReplyEmailJob, any, string>): Promise<any> {
    this.logger.log(`Processing reply job ${job.id} for ticket: ${job.data.ticketId}`);

    try {
      const {
        ticketId,
        messageId,
        toEmail,
        toName: _toName,
        subject,
        body,
        htmlBody,
        replyToMessageId: _replyToMessageId
      } = job.data;

      // TODO: build branded template, send via mailerService
      await this.mailerService.send({
        to: [toEmail],
        subject,
        text: body,
        html: htmlBody
      });

      // Update message with simulated outbound message ID if not provided by MailerService
      const emailMessageId = `outbound-${Date.now()}@kloqra.com`;
      await this.prisma.helpDeskTicketMessage.update({
        where: { id: messageId },
        data: { emailMessageId }
      });

      // Update ticket firstResponseAt if this is the first agent reply
      const ticket = await this.prisma.helpDeskTicket.findUnique({
        where: { id: ticketId },
        select: { firstResponseAt: true }
      });

      if (ticket && !ticket.firstResponseAt) {
        await this.prisma.helpDeskTicket.update({
          where: { id: ticketId },
          data: { firstResponseAt: new Date() }
        });
      }

      this.logger.log(`Successfully processed reply for ticket ${ticketId}`);
    } catch (error: any) {
      this.logger.error(`Failed to process reply for ticket: ${error.message}`, error.stack);
      throw error;
    }
  }
}
