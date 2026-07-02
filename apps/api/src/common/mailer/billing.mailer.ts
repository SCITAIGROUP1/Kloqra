import { Injectable, Logger } from "@nestjs/common";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  subjectPrefix
} from "./branded-email.layout";
import { MailerService, type SendMailResult } from "./mailer.service";

@Injectable()
export class BillingMailer {
  private readonly logger = new Logger(BillingMailer.name);

  constructor(private readonly mailer: MailerService) {}

  async sendPaymentFailed(input: {
    to: string;
    name: string;
    billingUrl: string;
  }): Promise<SendMailResult> {
    const layout = {
      title: "Payment failed",
      preheader: "Update your payment method to keep logging time.",
      body: `Hi ${input.name},\n\nWe could not process your latest subscription payment. Time logging is paused until billing is updated.`,
      ctaHref: input.billingUrl,
      ctaLabel: "Update billing",
      variant: "attention" as const,
      footer: "If you already updated your card, you can ignore this email."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix("Payment failed — action required"),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Payment failed email skipped (mailer unconfigured) for ${input.to}`);
    }

    return result;
  }

  async sendTrialEnding(input: {
    to: string;
    name: string;
    trialEndsAt: string | null;
    billingUrl: string;
  }): Promise<SendMailResult> {
    const endLabel = input.trialEndsAt
      ? new Date(input.trialEndsAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        })
      : "soon";

    const layout = {
      title: "Trial ending soon",
      preheader: "Choose a plan before your trial ends.",
      body: `Hi ${input.name},\n\nYour Kloqra trial ends on ${endLabel}. Upgrade now to keep your workspaces and time data.`,
      ctaHref: input.billingUrl,
      ctaLabel: "Choose a plan",
      variant: "info" as const
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix("Your trial is ending soon"),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Trial ending email skipped (mailer unconfigured) for ${input.to}`);
    }

    return result;
  }

  async sendSalesInquiryReceived(input: {
    to: string;
    name: string;
    planName: string;
    billingUrl: string;
  }): Promise<SendMailResult> {
    const layout = {
      title: "Sales inquiry received",
      preheader: "We received your enterprise plan request.",
      body: `Hi ${input.name},\n\nThanks for your interest in ${input.planName}. Our team will send payment instructions shortly.`,
      ctaHref: input.billingUrl,
      ctaLabel: "View billing",
      variant: "info" as const
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix("We received your sales inquiry"),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Sales inquiry email skipped (mailer unconfigured) for ${input.to}`);
    }

    return result;
  }

  async sendPaymentInstructions(input: {
    to: string;
    name: string;
    planName: string;
    billingInterval: string | null;
    instructions: string;
    billingUrl: string;
  }): Promise<SendMailResult> {
    const intervalLabel = input.billingInterval === "yearly" ? "yearly" : "monthly";
    const layout = {
      title: "Payment instructions",
      preheader: `Complete your ${input.planName} upgrade.`,
      body: `Hi ${input.name},\n\nTo activate ${input.planName} (${intervalLabel} billing), please use the instructions below and upload your receipt on the billing page.\n\n${input.instructions}`,
      ctaHref: input.billingUrl,
      ctaLabel: "Upload receipt",
      variant: "info" as const
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(`Payment instructions for ${input.planName}`),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Payment instructions email skipped (mailer unconfigured) for ${input.to}`);
    }

    return result;
  }

  async sendPlanActivatedByPlatform(input: {
    to: string;
    name: string;
    planName: string;
    billingUrl: string;
  }): Promise<SendMailResult> {
    const layout = {
      title: "Plan activated",
      preheader: `Your ${input.planName} plan is now active.`,
      body: `Hi ${input.name},\n\nYour organization is now on ${input.planName}. Thank you for your payment.`,
      ctaHref: input.billingUrl,
      ctaLabel: "View billing",
      variant: "success" as const
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(`Your ${input.planName} plan is active`),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Plan activated email skipped (mailer unconfigured) for ${input.to}`);
    }

    return result;
  }
}
