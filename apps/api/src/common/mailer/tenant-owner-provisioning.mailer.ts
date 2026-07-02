import { Injectable, Logger } from "@nestjs/common";
import { adminClientOrigin } from "./admin-origin.util";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  subjectPrefix
} from "./branded-email.layout";
import { MailerService, type SendMailResult } from "./mailer.service";

export type TenantOwnerCredentialsMailInput = {
  to: string;
  organizationName: string;
  temporaryPassword: string;
};

export type TenantAdminCredentialsMailInput = {
  to: string;
  organizationName: string;
  temporaryPassword: string;
  inviterName?: string;
};

export type TenantAdminAddedMailInput = {
  to: string;
  organizationName: string;
  inviterName?: string;
};

@Injectable()
export class TenantOwnerProvisioningMailer {
  private readonly logger = new Logger(TenantOwnerProvisioningMailer.name);

  constructor(private readonly mailer: MailerService) {}

  get isConfigured(): boolean {
    return this.mailer.isConfigured;
  }

  async sendOwnerCredentials(input: TenantOwnerCredentialsMailInput): Promise<SendMailResult> {
    const loginUrl = `${adminClientOrigin()}/login`;
    const layout = {
      title: `Welcome to ${input.organizationName}`,
      preheader: "Your organization owner sign-in details are inside.",
      body: `Your organization ${input.organizationName} has been provisioned on Kloqra.\n\nSign in with the credentials below. You will be asked to set a new password on first login, then complete your organization profile.`,
      ctaHref: loginUrl,
      ctaLabel: "Sign in to Kloqra Admin",
      variant: "success" as const,
      details: [
        { label: "Email", value: input.to },
        { label: "Temporary password", value: input.temporaryPassword },
        { label: "Sign-in URL", value: loginUrl }
      ],
      footer: "If you did not expect this email, contact Kloqra support."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(`Your ${input.organizationName} organization is ready`),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(
        `Tenant owner credentials email skipped (SMTP unconfigured) for ${input.to}. Temporary password logged for local dev only.`
      );
      this.logger.warn(`DEV ONLY temp password for ${input.to}: ${input.temporaryPassword}`);
    }

    return result;
  }

  async sendTenantAdminCredentials(
    input: TenantAdminCredentialsMailInput
  ): Promise<SendMailResult> {
    const loginUrl = `${adminClientOrigin()}/login`;
    const intro = input.inviterName
      ? `${input.inviterName} added you as an organization administrator for ${input.organizationName}.`
      : `You've been added as an organization administrator for ${input.organizationName} on Kloqra.`;

    const layout = {
      title: `Organization admin access — ${input.organizationName}`,
      preheader: "Your Kloqra Admin sign-in details are inside.",
      body: `${intro}\n\nSign in with the credentials below. You will be asked to set a new password on first login.`,
      ctaHref: loginUrl,
      ctaLabel: "Sign in to Kloqra Admin",
      variant: "success" as const,
      details: [
        { label: "Email", value: input.to },
        { label: "Temporary password", value: input.temporaryPassword },
        { label: "Sign-in URL", value: loginUrl }
      ],
      footer: "If you did not expect this email, contact Kloqra support."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(`Organization admin access for ${input.organizationName}`),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(
        `Tenant admin credentials email skipped (SMTP unconfigured) for ${input.to}. Temporary password logged for local dev only.`
      );
      this.logger.warn(`DEV ONLY temp password for ${input.to}: ${input.temporaryPassword}`);
    }

    return result;
  }

  async sendTenantAdminAdded(input: TenantAdminAddedMailInput): Promise<SendMailResult> {
    const loginUrl = `${adminClientOrigin()}/login`;
    const intro = input.inviterName
      ? `${input.inviterName} added you as an organization administrator for ${input.organizationName}.`
      : `You've been added as an organization administrator for ${input.organizationName}.`;

    const layout = {
      title: `Organization admin access — ${input.organizationName}`,
      preheader: "Sign in to Kloqra Admin with your existing account.",
      body: `${intro}\n\nSign in with your existing Kloqra account to manage workspaces and organization settings.`,
      ctaHref: loginUrl,
      ctaLabel: "Sign in to Kloqra Admin",
      variant: "success" as const,
      footer: "If you did not expect this email, contact Kloqra support."
    };

    return this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(`Organization admin access for ${input.organizationName}`),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });
  }
}
