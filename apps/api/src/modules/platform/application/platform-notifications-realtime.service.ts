import { Injectable } from "@nestjs/common";
import { platformNotificationUserChannel } from "../../../common/notifications/platform-realtime.constants";
import { RedisService } from "../../../common/redis/redis.service";

export { platformNotificationUserChannel };

@Injectable()
export class PlatformNotificationsRealtimeService {
  constructor(private redis: RedisService) {}

  async publishNotificationCreated(
    platformUserId: string,
    payload: { notification: unknown; unreadCount: number }
  ): Promise<void> {
    await this.redis
      .getClient()
      .publish(platformNotificationUserChannel(platformUserId), JSON.stringify(payload));
  }
}
