import type { NotificationCreatedEvent } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../common/redis/redis.service";
import { notificationUserChannel } from "./notifications-realtime.constants.js";

@Injectable()
export class NotificationsRealtimeService {
  constructor(private redis: RedisService) {}

  async publishNotificationCreated(
    userId: string,
    payload: NotificationCreatedEvent
  ): Promise<void> {
    await this.redis.getClient().publish(notificationUserChannel(userId), JSON.stringify(payload));
  }
}
