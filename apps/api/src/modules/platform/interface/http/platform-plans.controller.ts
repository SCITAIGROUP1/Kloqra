import { ROUTES, updatePlatformPlanSchema } from "@kloqra/contracts";
import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { type Request } from "express";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformSuperadminGuard } from "../../../../common/guards/platform-superadmin.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { platformAuditContextFromRequest } from "../../application/platform-audit-context.util";
import { PlatformPlansService } from "../../application/platform-plans.service";

@Controller()
@UseGuards(PlatformSuperadminGuard)
export class PlatformPlansController {
  constructor(private plans: PlatformPlansService) {}

  @Get(ROUTES.PLATFORM.PLANS)
  list(@CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.plans.listPlans();
  }

  @Get(ROUTES.PLATFORM.PLAN(":id"))
  detail(@Param("id") id: string, @CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.plans.getPlan(id);
  }

  @Patch(ROUTES.PLATFORM.PLAN(":id"))
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePlatformPlanSchema)) body: unknown,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.plans.updatePlan(
      id,
      body as Parameters<PlatformPlansService["updatePlan"]>[1],
      platformAuditContextFromRequest(user, req)
    );
  }
}
