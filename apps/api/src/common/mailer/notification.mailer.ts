import type { RenderedNotification } from "@kloqra/contracts";
import { Injectable, Logger } from "@nestjs/common";
import { originForNotificationHref } from "./app-origin.util";
import { MailerService, type SendMailResult } from "./mailer.service";
import {
  renderNotificationEmailHtml,
  renderNotificationEmailText
} from "./notification-email.layout";

export type NotificationEmailInput = {
  to: string;
  rendered: RenderedNotification;
};

@Injectable()
export class NotificationMailer {
  private readonly logger = new Logger(NotificationMailer.name);

  constructor(private readonly mailer: MailerService) {}

  async send(input: NotificationEmailInput): Promise<SendMailResult> {
    const href = input.rendered.metadata.href;
    const ctaHref = href
      ? `${originForNotificationHref(href)}${href}`
      : originForNotificationHref("/");
    const ctaLabel = input.rendered.metadata.ctaLabel ?? "Open Kloqra";
    const layoutInput = {
      title: input.rendered.title,
      body: input.rendered.body,
      preheader: input.rendered.preheader,
      ctaHref,
      ctaLabel,
      variant: input.rendered.metadata.variant,
      details: input.rendered.metadata.details
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: input.rendered.emailSubject,
      html: renderNotificationEmailHtml(layoutInput),
      text: renderNotificationEmailText(layoutInput)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Notification email skipped (SMTP unconfigured) for ${input.to}`);
    }

    return result;
  }
}
