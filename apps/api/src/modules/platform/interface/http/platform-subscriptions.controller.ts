import { listPlatformSubscriptionsQuerySchema, ROUTES } from "@kloqra/contracts";
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformGuard } from "../../../../common/guards/platform.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { PlatformSubscriptionsService } from "../../application/platform-subscriptions.service";

const paginationQuerySchema = z.object({
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().positive().default(1)),
  limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().int().positive().default(20))
});

@Controller()
@UseGuards(PlatformGuard)
export class PlatformSubscriptionsController {
  constructor(private subscriptionsService: PlatformSubscriptionsService) {}

  @Get(ROUTES.PLATFORM.SUBSCRIPTIONS)
  list(
    @Query(new ZodValidationPipe(listPlatformSubscriptionsQuerySchema)) query: unknown,
    @CurrentPlatformUser() _user: PlatformRequestUser
  ) {
    return this.subscriptionsService.listSubscriptions(
      query as Parameters<PlatformSubscriptionsService["listSubscriptions"]>[0]
    );
  }

  @Get(ROUTES.PLATFORM.SUBSCRIPTION_WORK_QUEUE)
  workQueue(@CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.subscriptionsService.getWorkQueue();
  }

  @Get(`${ROUTES.PLATFORM.SUBSCRIPTIONS}/:tenantId`)
  detail(@Param("tenantId") tenantId: string, @CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.subscriptionsService.getSubscriptionDetail(tenantId);
  }

  @Get(`${ROUTES.PLATFORM.SUBSCRIPTIONS}/:tenantId/events`)
  events(
    @Param("tenantId") tenantId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: any,
    @CurrentPlatformUser() _user: PlatformRequestUser
  ) {
    return this.subscriptionsService.getSubscriptionEvents(tenantId, query);
  }
}
