import { ROUTES } from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformSuperadminGuard } from "../../../../common/guards/platform-superadmin.guard";
import { PlatformOperationsControlsService } from "../../application/platform-operations-controls.service";

@Controller()
@UseGuards(PlatformSuperadminGuard)
export class PlatformOperationsControlsController {
  constructor(private service: PlatformOperationsControlsService) {}

  @Get(ROUTES.PLATFORM.QUEUE_FAILED_JOBS(":name"))
  async getFailedJobs(@Param("name") name: string) {
    return this.service.getFailedJobs(name);
  }

  @Post(ROUTES.PLATFORM.QUEUE_RETRY_JOB(":name", ":jobId"))
  async retryJob(
    @Param("name") name: string,
    @Param("jobId") jobId: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.retryJob(name, jobId, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.QUEUE_PAUSE(":name"))
  async pauseQueue(@Param("name") name: string, @CurrentPlatformUser() actor: PlatformRequestUser) {
    return this.service.pauseQueue(name, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.QUEUE_RESUME(":name"))
  async resumeQueue(
    @Param("name") name: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.resumeQueue(name, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.QUEUE_RETRY_FAILED(":name"))
  async retryFailedJobs(
    @Param("name") name: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.retryFailedJobs(name, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_LIMITS_OVERRIDE(":id"))
  async overrideLimits(
    @Param("id") tenantId: string,
    @Body() limits: Record<string, any>,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.overrideLimits(tenantId, limits, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_GRACE_PERIOD(":id"))
  async updateGracePeriod(
    @Param("id") tenantId: string,
    @Body("graceDays", ParseIntPipe) graceDays: number,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.updateGracePeriod(tenantId, graceDays, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_REVOKE_SESSIONS(":id"))
  async revokeSessions(
    @Param("id") tenantId: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.revokeTenantSessions(tenantId, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_RESET_MFA(":id"))
  async resetMfa(@Param("id") tenantId: string, @CurrentPlatformUser() actor: PlatformRequestUser) {
    return this.service.resetTenantMfa(tenantId, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_GDPR_EXPORT(":id"))
  async gdprExportTenant(
    @Param("id") tenantId: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.gdprExportTenant(tenantId, actor.platformUserId);
  }

  @Delete(ROUTES.PLATFORM.TENANT_GDPR_DELETE(":id"))
  async gdprDelete(
    @Param("id") tenantId: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.gdprDeleteTenant(tenantId, actor.platformUserId);
  }
}
