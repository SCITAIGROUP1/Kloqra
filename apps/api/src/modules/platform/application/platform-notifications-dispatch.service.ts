import type {
  NotificationPreferenceKey,
  NotificationType,
  RenderedNotification,
  PlatformNotificationType
} from "@kloqra/contracts";
import {
  parsePlatformPreferences,
  platformNotificationPreferenceKeyMap,
  resolvePlatformNotificationChannels
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { NotificationMailer } from "../../../common/mailer/notification.mailer";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { PlatformNotificationsService } from "./platform-notifications.service";

export type PlatformNotifyInput = {
  type: PlatformNotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  /** When set, skip users who triggered the action (optional). */
  excludePlatformUserId?: string;
};

@Injectable()
export class PlatformNotificationsDispatchService {
  constructor(
    private prisma: PrismaService,
    private notifications: PlatformNotificationsService,
    private notificationMailer: NotificationMailer
  ) {}

  async notifyAll(input: PlatformNotifyInput): Promise<void> {
    const preferenceKey = platformNotificationPreferenceKeyMap[input.type];
    const users = await this.prisma.platformUser.findMany({
      where: { isActive: true, role: "SUPERADMIN" },
      select: { id: true, email: true, preferences: true }
    });

    for (const user of users) {
      if (input.excludePlatformUserId && user.id === input.excludePlatformUserId) {
        continue;
      }
      const channels = resolvePlatformNotificationChannels(
        parsePlatformPreferences(user.preferences),
        preferenceKey
      );
      await this.deliver(user.id, user.email, input, channels);
    }
  }

  private async deliver(
    platformUserId: string,
    email: string,
    input: PlatformNotifyInput,
    channels: { inApp: boolean; email: boolean }
  ): Promise<void> {
    if (channels.inApp) {
      await this.notifications.createInApp({
        platformUserId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata
      });
    }

    if (channels.email) {
      const preferenceKey = platformNotificationPreferenceKeyMap[input.type];
      const rendered: RenderedNotification = {
        type: input.type as unknown as NotificationType,
        preferenceKey: preferenceKey as unknown as NotificationPreferenceKey,
        title: input.title,
        body: input.body,
        emailSubject: input.title,
        preheader: input.body.slice(0, 120),
        metadata: (input.metadata ?? {}) as RenderedNotification["metadata"]
      };
      await this.notificationMailer.send({
        to: email,
        rendered
      });
    }
  }
}
