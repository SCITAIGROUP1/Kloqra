import {
  listNotificationsQuerySchema,
  markAllNotificationsReadSchema,
  ROUTES,
  updateNotificationReadSchema,
  type ListNotificationsQuery,
  type MarkAllNotificationsReadDto,
  type UpdateNotificationReadDto
} from "@kloqra/contracts";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { NotificationsService } from "../../application/notifications.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get(ROUTES.NOTIFICATIONS.LIST)
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema)) query: ListNotificationsQuery
  ) {
    return this.notifications.list(user.userId, user.workspaceId, query);
  }

  @Get(ROUTES.NOTIFICATIONS.UNREAD_COUNT)
  unreadCount(@CurrentUser() user: RequestUser) {
    return this.notifications.unreadCount(user.userId, user.workspaceId);
  }

  @Patch(ROUTES.NOTIFICATIONS.BY_ID(":id"))
  updateRead(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateNotificationReadSchema)) body: UpdateNotificationReadDto
  ) {
    return this.notifications.updateRead(user.userId, user.workspaceId, id, body);
  }

  @Post(ROUTES.NOTIFICATIONS.MARK_ALL_READ)
  markAllRead(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(markAllNotificationsReadSchema)) body: MarkAllNotificationsReadDto
  ) {
    return this.notifications.markAllRead(user.userId, user.workspaceId, body);
  }
}
