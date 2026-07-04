import { Injectable, Logger } from "@nestjs/common";

export interface SendSmsResult {
  sent: boolean;
  reason?: "unconfigured" | "failed";
  detail?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly smsTransport: string | undefined;
  private readonly brevoApiKey: string | undefined;
  private readonly smsSender: string;

  constructor() {
    this.smsTransport = process.env.SMS_TRANSPORT?.trim().toLowerCase();
    this.brevoApiKey = process.env.BREVO_API_KEY?.trim();
    this.smsSender = process.env.SMS_SENDER?.trim() || "Kloqra";
  }

  async sendVerificationCode(phone: string, code: string): Promise<SendSmsResult> {
    const message = `Your Kloqra phone verification code is: ${code}. It expires in 10 minutes.`;

    if (this.smsTransport === "brevo" || this.smsTransport === "brevo_sms") {
      if (!this.brevoApiKey) {
        this.logger.error("Brevo SMS transport selected but BREVO_API_KEY is not configured.");
        return { sent: false, reason: "unconfigured", detail: "BREVO_API_KEY is missing" };
      }

      this.logger.log(`Sending Brevo SMS to ${phone}...`);
      try {
        const response = await fetch("https://api.brevo.com/v3/transactionalSMS/send", {
          method: "POST",
          headers: {
            "api-key": this.brevoApiKey,
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            sender: this.smsSender.slice(0, 11), // Brevo sender max 11 alphanumeric characters
            recipient: phone,
            content: message,
            type: "transactional"
          })
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as any;
          this.logger.error(
            `Brevo SMS send failed: ${response.status} - ${JSON.stringify(errorData)}`
          );
          return {
            sent: false,
            reason: "failed",
            detail: errorData.message || response.statusText
          };
        }

        this.logger.log(`Brevo SMS successfully sent to ${phone}`);
        return { sent: true };
      } catch (err) {
        this.logger.error(
          `Failed to dispatch Brevo SMS: ${err instanceof Error ? err.message : String(err)}`
        );
        return {
          sent: false,
          reason: "failed",
          detail: err instanceof Error ? err.message : String(err)
        };
      }
    }

    this.logger.warn(`[SMS Service Dev Fallback] Code: ${code} for ${phone}`);
    this.logger.log(`[SMS Msg]: ${message}`);
    return { sent: true };
  }
}
