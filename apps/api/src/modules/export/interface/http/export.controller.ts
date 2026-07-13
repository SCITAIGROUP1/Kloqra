import {
  createExportJobSchema,
  createExportPresetSchema,
  createExportScheduleSchema,
  createReportShareSchema,
  exportBodySchema,
  exportPreviewBodySchema,
  exportQuerySchema,
  generateInvoiceSchema,
  type GenerateInvoiceDto,
  memberExportBodySchema,
  ROUTES,
  updateExportScheduleSchema
} from "@kloqra/contracts";
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
import { type Response } from "express";
import { ProjectAccessService } from "../../../../common/access/project-access.service";
import { Roles } from "../../../../common/decorators/roles.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { CommercialFeaturesGuard } from "../../../../common/guards/commercial-features.guard";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { sendAttachment } from "../../../../common/http/attachment.util";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { ExportJobService } from "../../application/export-job.service";
import { ExportPresetService } from "../../application/export-preset.service";
import { ExportScheduleService } from "../../application/export-schedule.service";
import { ExportShareService } from "../../application/export-share.service";
import { ExportService } from "../../application/export.service";
import { InvoiceService } from "../../application/invoice.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  constructor(
    private exportService: ExportService,
    private exportJobs: ExportJobService,
    private exportPresets: ExportPresetService,
    private exportSchedules: ExportScheduleService,
    private exportShares: ExportShareService,
    private projectAccess: ProjectAccessService,
    private invoiceService: InvoiceService
  ) {}

  @Roles("ADMIN")
  @Post(ROUTES.EXPORT.GENERATE)
  async generatePost(
    @WorkspaceUser() user: WorkspaceRequestUser,
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
  @UseGuards(CommercialFeaturesGuard)
  @Post(ROUTES.EXPORT.INVOICE)
  async generateInvoice(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(generateInvoiceSchema)) body: GenerateInvoiceDto,
    @Res() res: Response
  ) {
    const result = await this.invoiceService.generate(user.workspaceId, body);
    sendAttachment(res, {
      buffer: result.buffer,
      contentType: "application/pdf",
      filename: result.filename
    });
  }

  @Roles("ADMIN")
  @Post(ROUTES.EXPORT.JOBS)
  async createJob(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createExportJobSchema)) body: unknown
  ) {
    return this.exportJobs.create(
      user.workspaceId,
      user.userId,
      body as Parameters<ExportJobService["create"]>[2]
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.EXPORT.JOBS)
  async listJobs(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.exportJobs.list(user.workspaceId);
  }

  @Roles("ADMIN")
  @Get(ROUTES.EXPORT.JOB(":id"))
  async getJob(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    return this.exportJobs.get(user.workspaceId, id);
  }

  @Roles("ADMIN")
  @Get(ROUTES.EXPORT.JOB_DOWNLOAD(":id"))
  async downloadJob(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Res() res: Response
  ) {
    const result = await this.exportJobs.download(user.workspaceId, id);
    sendAttachment(res, result);
  }

  @Roles("ADMIN")
  @HttpCode(200)
  @Post(ROUTES.EXPORT.PREVIEW)
  async preview(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(exportPreviewBodySchema)) body: unknown
  ) {
    return this.exportService.preview(
      user.workspaceId,
      body as Parameters<ExportService["preview"]>[1]
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.EXPORT.PRESETS)
  async listPresets(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.exportPresets.list(user.workspaceId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.EXPORT.PRESETS)
  async createPreset(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createExportPresetSchema)) body: unknown
  ) {
    return this.exportPresets.create(
      user.workspaceId,
      body as Parameters<ExportPresetService["create"]>[1]
    );
  }

  @Roles("ADMIN")
  @Delete(ROUTES.EXPORT.PRESET(":id"))
  async deletePreset(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    await this.exportPresets.remove(user.workspaceId, id);
    return { ok: true };
  }

  @Roles("ADMIN")
  @Get(ROUTES.EXPORT.SCHEDULES)
  async listSchedules(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.exportSchedules.list(user.workspaceId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.EXPORT.SCHEDULES)
  async createSchedule(
    @WorkspaceUser() user: WorkspaceRequestUser,
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
    @WorkspaceUser() user: WorkspaceRequestUser,
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
  async deleteSchedule(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    await this.exportSchedules.remove(user.workspaceId, id);
    return { ok: true };
  }

  @Roles("ADMIN")
  @HttpCode(200)
  @Post(ROUTES.EXPORT.SHARES)
  async createShare(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createReportShareSchema)) body: unknown
  ) {
    const rawAdmin = process.env.PUBLIC_ADMIN_URL ?? process.env.ADMIN_PUBLIC_URL;
    let adminBase: string;
    if (rawAdmin) {
      const parts = rawAdmin
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      const adminLike = parts.find((o) => o.includes(":3002") || /admin/i.test(o));
      adminBase = (adminLike ?? parts[0] ?? "http://localhost:3002").replace(/\/$/, "");
    } else {
      adminBase = "http://localhost:3002";
    }
    return this.exportShares.create(
      user.workspaceId,
      body as Parameters<ExportShareService["create"]>[1],
      adminBase
    );
  }

  @Roles("ADMIN", "MEMBER")
  @Post(ROUTES.EXPORT.ME)
  async generateMember(
    @WorkspaceUser() user: WorkspaceRequestUser,
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
    @WorkspaceUser() user: WorkspaceRequestUser,
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
