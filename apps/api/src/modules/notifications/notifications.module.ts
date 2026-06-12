import { Module } from "@nestjs/common";
import { NotificationMailer } from "../../common/mailer/notification.mailer";
import { AuthModule } from "../auth/auth.module";
import { NotificationsDispatchService } from "./application/notifications-dispatch.service";
import { NotificationsService } from "./application/notifications.service";
import { NotificationsController } from "./interface/http/notifications.controller";

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsDispatchService, NotificationMailer],
  exports: [NotificationsService, NotificationsDispatchService]
})
export class NotificationsModule {}
