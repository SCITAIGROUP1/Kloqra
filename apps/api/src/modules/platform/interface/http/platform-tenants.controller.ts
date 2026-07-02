import {
  createPlatformTenantSchema,
  listPlatformTenantsQuerySchema,
  ROUTES,
  updatePlatformTenantSchema,
  type CreatePlatformTenantDto,
  type UpdatePlatformTenantDto
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { type Request } from "express";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformGuard } from "../../../../common/guards/platform.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { platformAuditContextFromRequest } from "../../application/platform-audit-context.util";
import { PlatformTenantsService } from "../../application/platform-tenants.service";

@Controller()
@UseGuards(PlatformGuard)
export class PlatformTenantsController {
  constructor(private platformTenants: PlatformTenantsService) {}

  @Get(ROUTES.PLATFORM.TENANTS)
  list(
    @Query(new ZodValidationPipe(listPlatformTenantsQuerySchema)) query: unknown,
    @CurrentPlatformUser() _user: PlatformRequestUser
  ) {
    return this.platformTenants.listTenants(
      query as Parameters<PlatformTenantsService["listTenants"]>[0]
    );
  }

  @Post(ROUTES.PLATFORM.TENANTS)
  create(
    @Body(new ZodValidationPipe(createPlatformTenantSchema)) body: CreatePlatformTenantDto,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.platformTenants.createTenant(body, platformAuditContextFromRequest(user, req));
  }

  @Get(`${ROUTES.PLATFORM.TENANTS}/:id`)
  detail(@Param("id") id: string, @CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.platformTenants.getTenant(id);
  }

  @Patch(`${ROUTES.PLATFORM.TENANTS}/:id`)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePlatformTenantSchema)) body: UpdatePlatformTenantDto,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.platformTenants.updateTenant(id, body, platformAuditContextFromRequest(user, req));
  }

  @Post(ROUTES.PLATFORM.SUSPEND_TENANT(":id"))
  suspend(
    @Param("id") id: string,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.platformTenants.suspendTenant(id, platformAuditContextFromRequest(user, req));
  }

  @Delete(ROUTES.PLATFORM.TENANT_DELETE(":id"))
  delete(
    @Param("id") id: string,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.platformTenants.deleteTenant(id, platformAuditContextFromRequest(user, req));
  }
}
