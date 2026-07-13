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
import { ProjectAccessService } from "../../../../common/access/project-access.service";
import { Roles } from "../../../../common/decorators/roles.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { AdminOrProjectManagerGuard } from "../../../../common/guards/admin-or-project-manager.guard";
import { CommercialFeaturesGuard } from "../../../../common/guards/commercial-features.guard";
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
    private widgetShares: WidgetShareService,
    private access: ProjectAccessService
  ) {}

  private async allowedProjectIds(user: WorkspaceRequestUser): Promise<string[] | undefined> {
    if (user.role === "ADMIN") return undefined;
    return this.access.manageableProjectIds(user.workspaceId, user.userId, user.role);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.REPORTING.DASHBOARD)
  async dashboard(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.dashboard(
      user.workspaceId,
      query as Parameters<ReportingService["dashboard"]>[1],
      projectIds
    );
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.REPORTING.UTILIZATION)
  async utilization(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(utilizationQuerySchema)) query: UtilizationQueryDto
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.utilization(user.workspaceId, query, projectIds);
  }

  @UseGuards(AdminOrProjectManagerGuard, CommercialFeaturesGuard)
  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.REPORTING.BUDGET(":id"))
  async budgetBurnDown(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    await this.access.assertCanManageProject(user.workspaceId, user.userId, user.role, id);
    return this.reporting.budgetBurnDown(user.workspaceId, id);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.REPORTING.HEATMAP)
  async heatmap(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.heatmap(
      user.workspaceId,
      query as Parameters<ReportingService["heatmap"]>[1],
      projectIds
    );
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.REPORTING.CATEGORIES_HEATMAP)
  async categoriesHeatmap(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.categoryProjectHeatmap(
      user.workspaceId,
      query as Parameters<ReportingService["categoryProjectHeatmap"]>[1],
      projectIds
    );
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.REPORTING.TASKS)
  async tasks(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.tasks(
      user.workspaceId,
      query as Parameters<ReportingService["tasks"]>[1],
      projectIds
    );
  }

  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.REPORTING.PROJECT_SUMMARY(":projectId"))
  projectSummary(
    @WorkspaceUser() user: WorkspaceRequestUser,
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
    @WorkspaceUser() user: WorkspaceRequestUser,
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
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createWidgetShareSchema)) body: unknown
  ) {
    const rawAdmin = process.env.PUBLIC_ADMIN_URL ?? process.env.ADMIN_PUBLIC_URL;
    let adminBase: string;
    if (rawAdmin) {
      const parts = rawAdmin
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      const adminLike = parts.find((o) => o.includes(":3002") || /admin/i.test(o));
      adminBase = (adminLike ?? parts[0] ?? "http://localhost:3002").replace(/\/$/, "");
    } else {
      adminBase = "http://localhost:3002";
    }
    return this.widgetShares.create(
      user.workspaceId,
      body as Parameters<WidgetShareService["create"]>[1],
      adminBase
    );
  }
}
