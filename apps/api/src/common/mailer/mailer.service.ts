import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface SendMailOptions {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: MailAttachment[];
}

export type SendMailResult = {
  sent: boolean;
  reason?: "unconfigured" | "failed";
};

/**
 * Thin Nodemailer wrapper.
 * Reads SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM from env.
 * Gracefully no-ops (with a log warning) when SMTP_HOST is not configured.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    this.from = process.env.SMTP_FROM?.trim() ?? "Kloqra <noreply@kloqra.app>";

    if (!host) {
      this.logger.warn(
        "SMTP_HOST is not configured — email delivery is disabled. " +
          "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS to enable."
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.logger.log(`Mailer configured — SMTP host: ${host}`);
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(opts: SendMailOptions): Promise<SendMailResult> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent (SMTP unconfigured): to=${opts.to.join(", ")} subject="${opts.subject}"`
      );
      return { sent: false, reason: "unconfigured" };
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opts.to.join(", "),
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        attachments: opts.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType
        }))
      });

      this.logger.log(`Email sent: to=${opts.to.join(", ")} subject="${opts.subject}"`);
      return { sent: true };
    } catch (err) {
      this.logger.error(
        `Email send failed: to=${opts.to.join(", ")} subject="${opts.subject}"`,
        err instanceof Error ? err.stack : String(err)
      );
      return { sent: false, reason: "failed" };
    }
  }
}
