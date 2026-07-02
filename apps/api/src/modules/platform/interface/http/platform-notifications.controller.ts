import {
  listPlatformNotificationsQuerySchema,
  markAllPlatformNotificationsReadSchema,
  ROUTES,
  updatePlatformNotificationReadSchema
} from "@kloqra/contracts";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformGuard } from "../../../../common/guards/platform.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { PlatformNotificationsService } from "../../application/platform-notifications.service";

@Controller()
@UseGuards(PlatformGuard)
export class PlatformNotificationsController {
  constructor(private notifications: PlatformNotificationsService) {}

  @Get(ROUTES.PLATFORM.NOTIFICATIONS)
  list(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Query(new ZodValidationPipe(listPlatformNotificationsQuerySchema)) query: unknown
  ) {
    return this.notifications.list(
      user.platformUserId,
      query as Parameters<PlatformNotificationsService["list"]>[1]
    );
  }

  @Get(ROUTES.PLATFORM.NOTIFICATIONS_UNREAD_COUNT)
  unreadCount(@CurrentPlatformUser() user: PlatformRequestUser) {
    return this.notifications.unreadCount(user.platformUserId);
  }

  @Patch(ROUTES.PLATFORM.NOTIFICATION(":id"))
  updateRead(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePlatformNotificationReadSchema)) body: unknown
  ) {
    return this.notifications.updateRead(
      user.platformUserId,
      id,
      body as Parameters<PlatformNotificationsService["updateRead"]>[2]
    );
  }

  @Post(ROUTES.PLATFORM.NOTIFICATIONS_MARK_ALL_READ)
  markAllRead(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Body(new ZodValidationPipe(markAllPlatformNotificationsReadSchema)) body: unknown
  ) {
    return this.notifications.markAllRead(
      user.platformUserId,
      body as Parameters<PlatformNotificationsService["markAllRead"]>[1]
    );
  }
}
