import {
  createTimeLogSchema,
  listTimeLogsQuerySchema,
  listTimeLogOccupancyQuerySchema,
  updateTimeLogSchema,
  createBatchTimeLogsSchema,
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
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TimelogAuditService } from "../../application/timelog-audit.service";
import { TimelogsService } from "../../application/timelogs.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
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
      query as ListTimeLogsQueryDto,
      user.managedProjectIds
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

  @Roles("ADMIN")
  @Get(ROUTES.TIMELOGS.AUDIT_EVENTS_WORKSPACE)
  workspaceAuditEvents(
    @CurrentUser() user: RequestUser,
    @Query() query: { from: string; to: string; entryUserId?: string }
  ) {
    return this.audit.listForWorkspace(user.workspaceId, query);
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
      user.role,
      body as Parameters<TimelogsService["create"]>[3]
    );
  }

  @Post(ROUTES.TIMELOGS.CREATE_BATCH)
  createBatch(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createBatchTimeLogsSchema)) body: unknown
  ) {
    return this.timelogs.createBatch(
      user.workspaceId,
      user.userId,
      user.role,
      body as Parameters<TimelogsService["createBatch"]>[3]
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
