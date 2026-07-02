import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, Header, Param, Post, Res, UseGuards } from "@nestjs/common";
import { type Response } from "express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { TenantRoles } from "../../../../common/decorators/tenant-roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { TenantRolesGuard } from "../../../../common/guards/tenant-roles.guard";
import { TenantDataExportService } from "../../application/tenant-data-export.service";

@Controller()
@UseGuards(JwtAuthGuard, TenantRolesGuard)
export class ComplianceController {
  constructor(private tenantDataExport: TenantDataExportService) {}

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.DATA_EXPORT)
  createExport(@CurrentUser() user: RequestUser) {
    return this.tenantDataExport.create(user.tenantId, user.userId);
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
}
