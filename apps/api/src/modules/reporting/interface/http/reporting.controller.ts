import {
  myWeekQuerySchema,
  reportQuerySchema,
  utilizationQuerySchema,
  type UtilizationQueryDto,
  ROUTES
} from "@kloqra/contracts";
import { Controller, Get, Query, Param, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { ReportingService } from "../../application/reporting.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
  constructor(private reporting: ReportingService) {}

  @Roles("ADMIN")
  @Get(ROUTES.REPORTING.DASHBOARD)
  dashboard(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.reporting.dashboard(
      user.workspaceId,
      query as Parameters<ReportingService["dashboard"]>[1]
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.REPORTING.UTILIZATION)
  utilization(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(utilizationQuerySchema)) query: UtilizationQueryDto
  ) {
    return this.reporting.utilization(user.workspaceId, query);
  }

  @Roles("ADMIN")
  @Get(ROUTES.REPORTING.BUDGET(":id"))
  budgetBurnDown(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.reporting.budgetBurnDown(user.workspaceId, id);
  }

  @Roles("ADMIN")
  @Get(ROUTES.REPORTING.HEATMAP)
  heatmap(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.reporting.heatmap(
      user.workspaceId,
      query as Parameters<ReportingService["heatmap"]>[1]
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.REPORTING.CATEGORIES_HEATMAP)
  categoriesHeatmap(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.reporting.categoryProjectHeatmap(
      user.workspaceId,
      query as Parameters<ReportingService["categoryProjectHeatmap"]>[1]
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.REPORTING.TASKS)
  tasks(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.reporting.tasks(
      user.workspaceId,
      query as Parameters<ReportingService["tasks"]>[1]
    );
  }

  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.REPORTING.ME)
  myWeek(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(myWeekQuerySchema)) query: unknown
  ) {
    return this.reporting.myWeekSummary(
      user.workspaceId,
      user.userId,
      query as Parameters<ReportingService["myWeekSummary"]>[2]
    );
  }
}
