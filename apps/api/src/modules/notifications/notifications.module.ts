import { Module } from "@nestjs/common";
import { NotificationMailer } from "../../common/mailer/notification.mailer";
import { RedisModule } from "../../common/redis/redis.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsDispatchService } from "./application/notifications-dispatch.service.js";
import { NotificationsRealtimeService } from "./application/notifications-realtime.service.js";
import { NotificationsService } from "./application/notifications.service.js";
import { NotificationsController } from "./interface/http/notifications.controller.js";
import { NotificationsGateway } from "./interface/ws/notifications.gateway.js";

@Module({
  imports: [AuthModule, RedisModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsDispatchService,
    NotificationMailer,
    NotificationsRealtimeService,
    NotificationsGateway
  ],
  exports: [NotificationsService, NotificationsDispatchService]
})
export class NotificationsModule {}
