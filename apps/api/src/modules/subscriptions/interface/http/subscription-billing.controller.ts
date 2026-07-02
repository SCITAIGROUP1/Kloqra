import {
  changeSubscriptionPlanSchema,
  createCheckoutSessionSchema,
  ErrorCodes,
  ROUTES,
  type ChangeSubscriptionPlanDto,
  type CreateCheckoutSessionDto
} from "@kloqra/contracts";
import { Body, Controller, ForbiddenException, Patch, Post, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { TenantRoles } from "../../../../common/decorators/tenant-roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { TenantRolesGuard } from "../../../../common/guards/tenant-roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { isBillingSimulated } from "../../application/billing-mode.util";
import { SubscriptionBillingService } from "../../application/subscription-billing.service";
import { SubscriptionsService } from "../../application/subscriptions.service";

@Controller()
@UseGuards(JwtAuthGuard, TenantRolesGuard)
export class SubscriptionBillingController {
  constructor(
    private billing: SubscriptionBillingService,
    private subscriptions: SubscriptionsService
  ) {}

  @TenantRoles("OWNER")
  @Patch(ROUTES.TENANTS.SUBSCRIPTION)
  changePlan(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(changeSubscriptionPlanSchema)) body: ChangeSubscriptionPlanDto
  ) {
    if (!isBillingSimulated()) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Direct plan changes are only available in simulated billing mode"
      });
    }
    return this.subscriptions.changePlan(user.tenantId, body.planSlug);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.CHECKOUT)
  createCheckout(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCheckoutSessionSchema)) body: CreateCheckoutSessionDto
  ) {
    return this.billing.createCheckoutSession(user.tenantId, body);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.PORTAL)
  createPortal(@CurrentUser() user: RequestUser) {
    return this.billing.createPortalSession(user.tenantId);
  }
}
