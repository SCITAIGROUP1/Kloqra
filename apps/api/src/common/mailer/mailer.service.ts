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
  /** Sanitized SMTP error for admin-facing responses (no credentials). */
  detail?: string;
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
    const host = readEnvValue("SMTP_HOST");
    const user = readEnvValue("SMTP_USER");
    const pass = readEnvValue("SMTP_PASS");
    this.from = readEnvValue("SMTP_FROM") ?? "Kloqra <noreply@kloqra.app>";

    if (!host) {
      this.logger.warn(
        "SMTP_HOST is not configured — email delivery is disabled. " +
          "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM on the API service."
      );
      return;
    }

    if (!user || !pass) {
      this.logger.warn(
        "SMTP_HOST is set but SMTP_USER or SMTP_PASS is missing — email delivery is disabled."
      );
      return;
    }

    const port = Number(readEnvValue("SMTP_PORT") ?? "587");
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      auth: { user, pass }
    });

    this.logger.log(`Mailer configured — SMTP host: ${host}, from: ${this.from}`);
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
      const detail = sanitizeSmtpError(err);
      this.logger.error(
        `Email send failed: to=${opts.to.join(", ")} subject="${opts.subject}" — ${detail}`,
        err instanceof Error ? err.stack : String(err)
      );
      return { sent: false, reason: "failed", detail };
    }
  }
}

function sanitizeSmtpError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/\s+/g, " ").trim().slice(0, 240);
}

/** Strip accidental wrapping quotes copied from .env files into Railway/Vercel. */
export function readEnvValue(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}
