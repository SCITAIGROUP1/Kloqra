import {
  createHourlyRateSchema,
  listHourlyRatesQuerySchema,
  reportQuerySchema,
  type ListHourlyRatesQuery,
  ROUTES
} from "@kloqra/contracts";
import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { BillingService } from "../../application/billing.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private billing: BillingService) {}

  @Roles("ADMIN")
  @Get(ROUTES.BILLING.RATES)
  listRates(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listHourlyRatesQuerySchema)) query: ListHourlyRatesQuery
  ) {
    return this.billing.listRates(user.workspaceId, query);
  }

  @Roles("ADMIN")
  @Post(ROUTES.BILLING.RATES)
  createRate(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createHourlyRateSchema)) body: unknown
  ) {
    return this.billing.createRate(
      user.workspaceId,
      body as Parameters<BillingService["createRate"]>[1]
    );
  }

  @Get(ROUTES.BILLING.SUMMARY)
  summary(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.billing.summary(
      user.workspaceId,
      query as Parameters<BillingService["summary"]>[1]
    );
  }
}
