import {
  createTimeLogSchema,
  listTimeLogsQuerySchema,
  listTimeLogOccupancyQuerySchema,
  updateTimeLogSchema,
  ROUTES
} from "@kloqra/contracts";
import type { ListTimeLogsQueryDto, ListTimeLogOccupancyQueryDto } from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TimelogAuditService } from "../../application/timelog-audit.service";
import { TimelogsService } from "../../application/timelogs.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class TimelogsController {
  constructor(
    private timelogs: TimelogsService,
    private audit: TimelogAuditService
  ) {}

  @Get(ROUTES.TIMELOGS.LIST)
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listTimeLogsQuerySchema)) query: unknown
  ) {
    return this.timelogs.list(
      user.workspaceId,
      user.userId,
      user.role,
      query as ListTimeLogsQueryDto
    );
  }

  @Get(ROUTES.TIMELOGS.OCCUPANCY)
  occupancy(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listTimeLogOccupancyQuerySchema)) query: unknown
  ) {
    return this.timelogs.listOccupancy(
      user.userId,
      user.role,
      query as ListTimeLogOccupancyQueryDto
    );
  }

  @Get(ROUTES.TIMELOGS.AUDIT_EVENTS(":id"))
  auditEvents(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.audit.listForTimeLog(user.workspaceId, user.userId, user.role, id);
  }

  @Get(ROUTES.TIMELOGS.YESTERDAY_SUMMARY)
  async yesterdaySummary(@CurrentUser() user: RequestUser) {
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    return this.timelogs.yesterdaySummary(
      user.workspaceId,
      user.userId,
      yesterdayStart,
      yesterdayEnd
    );
  }

  @Post(ROUTES.TIMELOGS.CREATE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTimeLogSchema)) body: unknown
  ) {
    return this.timelogs.create(
      user.workspaceId,
      user.userId,
      body as Parameters<TimelogsService["create"]>[2]
    );
  }

  @Patch(ROUTES.TIMELOGS.BY_ID(":id"))
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTimeLogSchema)) body: unknown
  ) {
    return this.timelogs.update(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      body as Parameters<TimelogsService["update"]>[4]
    );
  }

  @Delete(ROUTES.TIMELOGS.BY_ID(":id"))
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.timelogs.remove(user.workspaceId, user.userId, user.role, id);
  }
}
