import {
  buildNotificationTemplate,
  parseUserPreferences,
  resolveNotificationChannels,
  type NotificationChannels,
  type NotificationTemplateContextMap,
  type NotificationTemplateId,
  type RenderedNotification
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { NotificationMailer } from "../../../common/mailer/notification.mailer";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

export type TemplateNotifyInput<T extends NotificationTemplateId> = {
  userId: string;
  workspaceId: string;
  templateId: T;
  context: NotificationTemplateContextMap[T];
};

@Injectable()
export class NotificationsDispatchService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private notificationMailer: NotificationMailer
  ) {}

  async notify<T extends NotificationTemplateId>(input: TemplateNotifyInput<T>): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, preferences: true }
    });
    if (!user) return;

    const rendered = buildNotificationTemplate(input.templateId, input.context);
    const channels = resolveNotificationChannels(
      parseUserPreferences(user.preferences),
      rendered.preferenceKey
    );

    await this.deliver(input.userId, input.workspaceId, rendered, user.email, channels);
  }

  async notifyWorkspaceAdmins<T extends NotificationTemplateId>(
    workspaceId: string,
    input: {
      templateId: T;
      context: NotificationTemplateContextMap[T];
    }
  ): Promise<void> {
    const rendered = buildNotificationTemplate(input.templateId, input.context);
    const admins = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: "ADMIN"
      },
      include: { user: { select: { id: true, email: true, preferences: true } } }
    });

    for (const admin of admins) {
      const channels = resolveNotificationChannels(
        parseUserPreferences(admin.user.preferences),
        rendered.preferenceKey
      );
      await this.deliver(admin.userId, workspaceId, rendered, admin.user.email, channels);
    }
  }

  private async deliver(
    userId: string,
    workspaceId: string,
    rendered: RenderedNotification,
    email: string,
    channels: NotificationChannels
  ): Promise<void> {
    if (channels.inApp) {
      await this.notifications.createInApp({
        userId,
        workspaceId,
        type: rendered.type,
        title: rendered.title,
        body: rendered.body,
        metadata: rendered.metadata
      });
    }

    if (channels.email) {
      await this.notificationMailer.send({
        to: email,
        rendered
      });
    }
  }
}
