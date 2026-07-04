import { ROUTES } from "@kloqra/contracts";
import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { type Response } from "express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { TenantRoles } from "../../../../common/decorators/tenant-roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { TenantRolesGuard } from "../../../../common/guards/tenant-roles.guard";
import { RedisService } from "../../../../common/redis/redis.service";
import { TenantDataExportService } from "../../application/tenant-data-export.service";
import { TenantDataImportService } from "../../application/tenant-data-import.service";

@Controller()
@UseGuards(JwtAuthGuard, TenantRolesGuard)
export class ComplianceController {
  constructor(
    private tenantDataExport: TenantDataExportService,
    private tenantDataImport: TenantDataImportService,
    private redisService: RedisService
  ) {}

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.DATA_EXPORT)
  createExport(@CurrentUser() user: RequestUser) {
    return this.tenantDataExport.create(user.tenantId, user.userId);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.DATA_EXPORT)
  getLatestExport(@CurrentUser() user: RequestUser) {
    return this.tenantDataExport.getLatest(user.tenantId);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.DATA_EXPORT_JOB(":jobId"))
  getExport(@CurrentUser() user: RequestUser, @Param("jobId") jobId: string) {
    return this.tenantDataExport.get(user.tenantId, jobId);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.DATA_EXPORT_JOB_DOWNLOAD(":jobId"))
  @Header("Cache-Control", "private, no-store")
  async downloadExport(
    @CurrentUser() user: RequestUser,
    @Param("jobId") jobId: string,
    @Res() res: Response
  ) {
    const { buffer, contentType, filename } = await this.tenantDataExport.download(
      user.tenantId,
      jobId
    );
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.DATA_IMPORT)
  @UseInterceptors(FileInterceptor("file"))
  async importData(
    @UploadedFile() file: { originalname: string; buffer: Buffer } | undefined,
    @CurrentUser() user: RequestUser
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    return this.tenantDataImport.create(user.tenantId, user.userId, file.originalname, file.buffer);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.DATA_IMPORT)
  async getLatestImport(@CurrentUser() user: RequestUser) {
    const redis = this.redisService.getClient();
    const latestJobId = await redis.get(`tenant:${user.tenantId}:latest-import`);
    if (!latestJobId) return null;
    try {
      return await this.tenantDataImport.get(user.tenantId, latestJobId);
    } catch {
      return null;
    }
  }
}
