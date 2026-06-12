import { Injectable, Logger } from "@nestjs/common";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  subjectPrefix
} from "./branded-email.layout";
import { clientOrigin } from "./client-origin.util";
import { MailerService, type SendMailResult } from "./mailer.service";

export type MemberCredentialsMailInput = {
  to: string;
  workspaceName: string;
  inviterName?: string;
  temporaryPassword: string;
};

export type WorkspaceAddedMailInput = {
  to: string;
  workspaceName: string;
  inviterName?: string;
};

@Injectable()
export class MemberProvisioningMailer {
  private readonly logger = new Logger(MemberProvisioningMailer.name);

  constructor(private readonly mailer: MailerService) {}

  async sendNewMemberCredentials(input: MemberCredentialsMailInput): Promise<SendMailResult> {
    const loginUrl = `${clientOrigin()}/login`;
    const intro = input.inviterName
      ? `${input.inviterName} added you to ${input.workspaceName}.`
      : `You've been added to ${input.workspaceName}.`;

    const layout = {
      title: `Welcome to ${input.workspaceName}`,
      preheader: "Your Kloqra sign-in details are inside.",
      body: `${intro}\n\nSign in with the credentials below. You will be asked to set a new password on first login.`,
      ctaHref: loginUrl,
      ctaLabel: "Sign in to Kloqra",
      variant: "success" as const,
      details: [
        { label: "Email", value: input.to },
        { label: "Temporary password", value: input.temporaryPassword },
        { label: "Sign-in URL", value: loginUrl }
      ],
      footer: "If you did not expect this email, contact your workspace admin."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(`You've been added to ${input.workspaceName}`),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(
        `Member credentials email skipped (SMTP unconfigured) for ${input.to}. Temporary password logged for local dev only.`
      );
      this.logger.warn(`DEV ONLY temp password for ${input.to}: ${input.temporaryPassword}`);
    }

    return result;
  }

  async sendWorkspaceAdded(input: WorkspaceAddedMailInput): Promise<SendMailResult> {
    const loginUrl = `${clientOrigin()}/login`;
    const intro = input.inviterName
      ? `${input.inviterName} added you to ${input.workspaceName}.`
      : `You've been added to ${input.workspaceName}.`;

    const layout = {
      title: `Welcome to ${input.workspaceName}`,
      preheader: "You can sign in with your existing Kloqra account.",
      body: `${intro}\n\nSign in with your existing Kloqra account to get started.`,
      ctaHref: loginUrl,
      ctaLabel: "Sign in to Kloqra",
      variant: "success" as const,
      footer: "If you did not expect this email, contact your workspace admin."
    };

    return this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(`You've been added to ${input.workspaceName}`),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });
  }
}
