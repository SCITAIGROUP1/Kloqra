import { Injectable, Logger } from "@nestjs/common";
import { adminClientOrigin } from "./admin-origin.util";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  subjectPrefix
} from "./branded-email.layout";
import { clientOrigin } from "./client-origin.util";
import { MailerService, type SendMailResult } from "./mailer.service";
import { platformClientOrigin } from "./platform-origin.util";

@Injectable()
export class AuthMailer {
  private readonly logger = new Logger(AuthMailer.name);

  constructor(private readonly mailer: MailerService) {}

  async sendPasswordReset(input: { to: string; resetUrl: string }): Promise<SendMailResult> {
    const layout = {
      title: "Reset your password",
      preheader: "Use this link to choose a new Kloqra password.",
      body: "We received a request to reset your password.\n\nThis link expires in 1 hour.",
      ctaHref: input.resetUrl,
      ctaLabel: "Reset password",
      variant: "attention" as const,
      footer: "If you did not request this, you can safely ignore this email."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix("Reset your password"),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Password reset email skipped (SMTP unconfigured) for ${input.to}`);
      this.logger.warn(`DEV ONLY password reset URL for ${input.to}: ${input.resetUrl}`);
    }

    return result;
  }

  async sendEmailVerification(input: { to: string; verifyUrl: string }): Promise<SendMailResult> {
    const layout = {
      title: "Verify your email",
      preheader: "Confirm your email to finish setting up your account.",
      body: "Please verify your email address to finish setting up your Kloqra account.\n\nThis link expires in 7 days.",
      ctaHref: input.verifyUrl,
      ctaLabel: "Verify email",
      variant: "info" as const,
      footer: "If you did not create a Kloqra account, you can ignore this email."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix("Verify your email"),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Verification email skipped (SMTP unconfigured) for ${input.to}`);
      this.logger.warn(`DEV ONLY verify URL for ${input.to}: ${input.verifyUrl}`);
    }

    return result;
  }

  async sendPlatformPasswordReset(input: {
    to: string;
    resetUrl: string;
  }): Promise<SendMailResult> {
    const layout = {
      title: "Reset your platform admin password",
      preheader: "Use this link to choose a new Kloqra platform password.",
      body: "We received a request to reset your platform admin password.\n\nThis link expires in 1 hour.",
      ctaHref: input.resetUrl,
      ctaLabel: "Reset password",
      variant: "attention" as const,
      footer: "If you did not request this, you can safely ignore this email."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix("Reset your platform admin password"),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Platform password reset email skipped (SMTP unconfigured) for ${input.to}`);
      this.logger.warn(`DEV ONLY platform password reset URL for ${input.to}: ${input.resetUrl}`);
    }

    return result;
  }
}

export function buildPasswordResetUrl(token: string): string {
  return `${clientOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
}

export function buildPlatformPasswordResetUrl(token: string): string {
  return `${platformClientOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
}

export function buildVerifyEmailUrl(token: string): string {
  return `${clientOrigin()}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildAdminVerifyEmailUrl(token: string): string {
  return `${adminClientOrigin()}/verify-email?token=${encodeURIComponent(token)}`;
}
