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

  constructor() {
    this.smsTransport = process.env.SMS_TRANSPORT?.trim().toLowerCase();
  }

  async sendVerificationCode(phone: string, code: string): Promise<SendSmsResult> {
    const message = `Your Kloqra phone verification code is: ${code}. It expires in 10 minutes.`;

    if (
      !this.smsTransport ||
      this.smsTransport === "console" ||
      this.smsTransport === "unconfigured"
    ) {
      this.logger.warn(`[SMS Service Dev Fallback] Code: ${code} for ${phone}`);
      this.logger.log(`[SMS Msg]: ${message}`);
      return { sent: true };
    }

    this.logger.log(`[SMS Service ${this.smsTransport}] Mock sending message to ${phone}...`);
    this.logger.log(`[SMS Message]: ${message}`);
    return { sent: true };
  }
}
