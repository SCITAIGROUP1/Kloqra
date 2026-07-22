import {
  createTimeLogSchema,
  listTimeLogsQuerySchema,
  listTimeLogOccupancyQuerySchema,
  updateTimeLogSchema,
  createBatchTimeLogsSchema,
  ErrorCodes,
  ROUTES
} from "@kloqra/contracts";
import type { ListTimeLogsQueryDto, ListTimeLogOccupancyQueryDto } from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { Roles } from "../../../../common/decorators/roles.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { DomainException } from "../../../../common/errors/domain.exception";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TimelogAuditService } from "../../application/timelog-audit.service";
import { TimelogImportService } from "../../application/timelog-import.service";
import { TimelogsService } from "../../application/timelogs.service";

function isClientAuthScope(authScope?: string): boolean {
  return authScope?.trim().toLowerCase() === "client";
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimelogsController {
  constructor(
    private timelogs: TimelogsService,
    private audit: TimelogAuditService,
    private timelogImport: TimelogImportService
  ) {}

  @Get(ROUTES.TIMELOGS.LIST)
  list(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(listTimeLogsQuerySchema)) query: unknown,
    @Headers("x-auth-scope") authScope?: string
  ) {
    return this.timelogs.list(
      user.workspaceId,
      user.userId,
      user.role,
      query as ListTimeLogsQueryDto,
      user.managedProjectIds,
      { clientScope: isClientAuthScope(authScope) }
    );
  }

  @Get(ROUTES.TIMELOGS.OCCUPANCY)
  occupancy(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(listTimeLogOccupancyQuerySchema)) query: unknown
  ) {
    return this.timelogs.listOccupancy(user.userId, query as ListTimeLogOccupancyQueryDto);
  }

  @Get(ROUTES.TIMELOGS.AUDIT_EVENTS(":id"))
  auditEvents(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    return this.audit.listForTimeLog(user.workspaceId, user.userId, user.role, id);
  }

  @Roles("ADMIN")
  @Get(ROUTES.TIMELOGS.AUDIT_EVENTS_WORKSPACE)
  workspaceAuditEvents(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query() query: { from: string; to: string; entryUserId?: string }
  ) {
    return this.audit.listForWorkspace(user.workspaceId, query);
  }

  @Get(ROUTES.TIMELOGS.YESTERDAY_SUMMARY)
  async yesterdaySummary(@WorkspaceUser() user: WorkspaceRequestUser) {
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

  @Get(ROUTES.TIMELOGS.IMPORT_TEMPLATE)
  async importTemplate(@WorkspaceUser() _user: WorkspaceRequestUser, @Res() res: Response) {
    await this.timelogImport.generateTemplate(res);
  }

  @Post(ROUTES.TIMELOGS.IMPORT)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  async importTimeLogs(
    @UploadedFile() file: { buffer: Buffer; originalname?: string } | undefined,
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body() body: { timezone?: string }
  ) {
    if (!file?.buffer?.length) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No file uploaded",
        HttpStatus.BAD_REQUEST
      );
    }
    return this.timelogImport.importFile({
      workspaceId: user.workspaceId,
      userId: user.userId,
      role: user.role,
      buffer: file.buffer,
      filename: file.originalname,
      timezone: body?.timezone
    });
  }

  @Post(ROUTES.TIMELOGS.CREATE)
  create(
    @WorkspaceUser() user: WorkspaceRequestUser,
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
    @WorkspaceUser() user: WorkspaceRequestUser,
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
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTimeLogSchema)) body: unknown,
    @Headers("x-auth-scope") authScope?: string
  ) {
    return this.timelogs.update(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      body as Parameters<TimelogsService["update"]>[4],
      { clientScope: isClientAuthScope(authScope) }
    );
  }

  @Delete(ROUTES.TIMELOGS.BY_ID(":id"))
  remove(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Headers("x-auth-scope") authScope?: string
  ) {
    return this.timelogs.remove(user.workspaceId, user.userId, user.role, id, {
      clientScope: isClientAuthScope(authScope)
    });
  }
}
