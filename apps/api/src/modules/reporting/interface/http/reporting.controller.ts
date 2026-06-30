import {
  myWeekQuerySchema,
  projectSummaryQuerySchema,
  reportQuerySchema,
  utilizationQuerySchema,
  createWidgetShareSchema,
  type UtilizationQueryDto,
  ROUTES
} from "@kloqra/contracts";
import { Controller, Get, Post, Query, Param, Body, UseGuards, HttpCode } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { ReportingService } from "../../application/reporting.service";
import { WidgetShareService } from "../../application/widget-share.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
  constructor(
    private reporting: ReportingService,
    private widgetShares: WidgetShareService
  ) {}

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
  @Get(ROUTES.REPORTING.PROJECT_SUMMARY(":projectId"))
  projectSummary(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Query(new ZodValidationPipe(projectSummaryQuerySchema)) query: unknown
  ) {
    return this.reporting.projectSummary(
      user.workspaceId,
      projectId,
      user.userId,
      user.role,
      query as Parameters<ReportingService["projectSummary"]>[4]
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

  @Roles("ADMIN")
  @HttpCode(200)
  @Post(ROUTES.REPORTING.WIDGET_SHARES)
  createWidgetShare(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createWidgetShareSchema)) body: unknown
  ) {
    const adminBase =
      process.env.PUBLIC_ADMIN_URL ??
      process.env.ADMIN_PUBLIC_URL ??
      (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
        .split(",")
        .map((o) => o.trim())
        .find((o) => o.includes(":3002")) ??
      "http://localhost:3002";
    return this.widgetShares.create(
      user.workspaceId,
      body as Parameters<WidgetShareService["create"]>[1],
      adminBase
    );
  }
}
