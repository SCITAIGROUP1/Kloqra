import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  brevoApiKeySetupHint,
  resolveBrevoApiKey,
  sendViaBrevoApi,
  shouldUseBrevoApi
} from "./brevo-api.util";

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
  /** Sanitized delivery error for admin-facing responses (no credentials). */
  detail?: string;
};

/**
 * Email delivery via Brevo HTTPS API (Railway-safe) or Nodemailer SMTP (local dev).
 * Reads SMTP_* / BREVO_API_KEY / EMAIL_TRANSPORT from env.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly useBrevoApi: boolean;
  private readonly brevoApiKey: string | undefined;

  constructor() {
    this.from = readEnvValue("SMTP_FROM") ?? "Kloqra <noreply@kloqra.app>";
    this.useBrevoApi = shouldUseBrevoApi(process.env);
    this.brevoApiKey = this.useBrevoApi ? resolveBrevoApiKey(process.env) : undefined;

    if (this.useBrevoApi) {
      if (!this.brevoApiKey) {
        this.logger.warn(
          `Brevo HTTPS API selected but not configured — ${brevoApiKeySetupHint(process.env)}`
        );
        return;
      }

      this.logger.log(`Mailer configured — Brevo HTTPS API, from: ${this.from}`);
      return;
    }

    const host = readEnvValue("SMTP_HOST");
    const user = readEnvValue("SMTP_USER");
    const pass = readEnvValue("SMTP_PASS");

    if (!host) {
      this.logger.warn(
        "SMTP_HOST is not configured — email delivery is disabled. " +
          "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM on the API service " +
          "or BREVO_API_KEY with EMAIL_TRANSPORT=brevo_api."
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
    return this.useBrevoApi ? Boolean(this.brevoApiKey) : this.transporter !== null;
  }

  async send(opts: SendMailOptions): Promise<SendMailResult> {
    if (this.useBrevoApi) {
      if (!this.brevoApiKey) {
        const detail = brevoApiKeySetupHint(process.env);
        this.logger.warn(
          `Email not sent (Brevo API unconfigured): to=${opts.to.join(", ")} subject="${opts.subject}" — ${detail}`
        );
        return { sent: false, reason: "failed", detail };
      }

      const result = await sendViaBrevoApi(this.brevoApiKey, this.from, opts);
      if (result.sent) {
        this.logger.log(
          `Email sent (Brevo API): to=${opts.to.join(", ")} subject="${opts.subject}"`
        );
      } else {
        this.logger.error(
          `Email send failed (Brevo API): to=${opts.to.join(", ")} subject="${opts.subject}" — ${result.detail ?? "unknown"}`
        );
      }
      return result;
    }

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
      const detail = sanitizeDeliveryError(err);
      this.logger.error(
        `Email send failed: to=${opts.to.join(", ")} subject="${opts.subject}" — ${detail}`,
        err instanceof Error ? err.stack : String(err)
      );
      return { sent: false, reason: "failed", detail };
    }
  }
}

function sanitizeDeliveryError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const normalized = raw.replace(/\s+/g, " ").trim().slice(0, 240);
  if (/connection timeout/i.test(normalized)) {
    return (
      "SMTP connection timed out. Railway Hobby blocks outbound SMTP — " +
      "redeploy with Brevo HTTPS API (auto on Railway) or upgrade to Railway Pro."
    );
  }
  return normalized;
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
