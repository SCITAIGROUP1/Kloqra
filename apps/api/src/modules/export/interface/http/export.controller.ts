import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards
} from "@nestjs/common";
import { Response } from "express";
import {
  createExportPresetSchema,
  createExportScheduleSchema,
  createReportShareSchema,
  exportBodySchema,
  exportPreviewBodySchema,
  exportQuerySchema,
  memberExportBodySchema,
  ROUTES,
  updateExportScheduleSchema
} from "@chronomint/contracts";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { CurrentUser, RequestUser } from "../../../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { sendAttachment } from "../../../../common/http/attachment.util";
import { ProjectAccessService } from "../../../projects/application/project-access.service";
import { ExportService } from "../../application/export.service";
import { ExportPresetService } from "../../application/export-preset.service";
import { ExportScheduleService } from "../../application/export-schedule.service";
import { ReportShareService } from "../../application/report-share.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  constructor(
    private exportService: ExportService,
    private exportPresets: ExportPresetService,
    private exportSchedules: ExportScheduleService,
    private reportShares: ReportShareService,
    private projectAccess: ProjectAccessService
  ) {}

  @Roles("ADMIN")
  @Post(ROUTES.EXPORT.GENERATE)
  async generatePost(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(exportBodySchema)) body: unknown,
    @Res() res: Response
  ) {
    const result = await this.exportService.generate(
      user.workspaceId,
      body as Parameters<ExportService["generate"]>[1]
    );
    sendAttachment(res, result);
  }

  @Roles("ADMIN")
  @HttpCode(200)
  @Post(ROUTES.EXPORT.PREVIEW)
  async preview(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(exportPreviewBodySchema)) body: unknown
  ) {
    return this.exportService.preview(
      user.workspaceId,
      body as Parameters<ExportService["preview"]>[1]
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.EXPORT.PRESETS)
  async listPresets(@CurrentUser() user: RequestUser) {
    return this.exportPresets.list(user.workspaceId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.EXPORT.PRESETS)
  async createPreset(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createExportPresetSchema)) body: unknown
  ) {
    return this.exportPresets.create(
      user.workspaceId,
      body as Parameters<ExportPresetService["create"]>[1]
    );
  }

  @Roles("ADMIN")
  @Delete(ROUTES.EXPORT.PRESET(":id"))
  async deletePreset(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.exportPresets.remove(user.workspaceId, id);
    return { ok: true };
  }

  @Roles("ADMIN")
  @Get(ROUTES.EXPORT.SCHEDULES)
  async listSchedules(@CurrentUser() user: RequestUser) {
    return this.exportSchedules.list(user.workspaceId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.EXPORT.SCHEDULES)
  async createSchedule(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createExportScheduleSchema)) body: unknown
  ) {
    return this.exportSchedules.create(
      user.workspaceId,
      body as Parameters<ExportScheduleService["create"]>[1]
    );
  }

  @Roles("ADMIN")
  @Patch(ROUTES.EXPORT.SCHEDULE(":id"))
  async updateSchedule(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateExportScheduleSchema)) body: unknown
  ) {
    return this.exportSchedules.update(
      user.workspaceId,
      id,
      body as Parameters<ExportScheduleService["update"]>[2]
    );
  }

  @Roles("ADMIN")
  @Delete(ROUTES.EXPORT.SCHEDULE(":id"))
  async deleteSchedule(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.exportSchedules.remove(user.workspaceId, id);
    return { ok: true };
  }

  @Roles("ADMIN")
  @HttpCode(200)
  @Post(ROUTES.EXPORT.SHARES)
  async createShare(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createReportShareSchema)) body: unknown
  ) {
    const adminBase =
      process.env.PUBLIC_ADMIN_URL ??
      process.env.ADMIN_PUBLIC_URL ??
      (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
        .split(",")
        .map((o) => o.trim())
        .find((o) => o.includes(":3002")) ??
      "http://localhost:3002";
    return this.reportShares.create(
      user.workspaceId,
      body as Parameters<ReportShareService["create"]>[1],
      adminBase
    );
  }

  @Roles("ADMIN", "MEMBER")
  @Post(ROUTES.EXPORT.ME)
  async generateMember(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(memberExportBodySchema)) body: unknown,
    @Res() res: Response
  ) {
    const dto = body as Parameters<ExportService["generateMember"]>[2];
    if (dto.projectId) {
      await this.projectAccess.assertCanAccessProject(
        user.workspaceId,
        user.userId,
        user.role,
        dto.projectId
      );
    }
    const result = await this.exportService.generateMember(user.workspaceId, user.userId, dto);
    sendAttachment(res, result);
  }

  @Roles("ADMIN")
  @Get(ROUTES.EXPORT.GENERATE)
  async generateGet(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(exportQuerySchema)) query: unknown,
    @Res() res: Response
  ) {
    const q = query as {
      from: string;
      to: string;
      projectId?: string;
      userId?: string;
      format: "csv" | "pdf" | "xlsx";
    };
    const result = await this.exportService.generateLegacy(user.workspaceId, q);
    sendAttachment(res, result);
  }
}
