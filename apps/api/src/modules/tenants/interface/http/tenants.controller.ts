import {
  assignWorkspaceAdminSchema,
  createTenantWorkspaceSchema,
  inviteTenantMemberSchema,
  ROUTES,
  tenantAnalyticsQuerySchema,
  updateTenantMemberSchema,
  updateTenantCurrentSchema,
  updateWorkspaceMemberSchema,
  workspaceAdminsOverviewQuerySchema,
  type AssignWorkspaceAdminDto,
  type CreateTenantWorkspaceDto,
  type InviteTenantMemberDto,
  type TenantAnalyticsQueryDto,
  type UpdateTenantCurrentDto,
  type UpdateTenantMemberDto,
  type UpdateWorkspaceMemberDto,
  type WorkspaceAdminsOverviewQuery
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
  UseGuards
} from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { TenantRoles } from "../../../../common/decorators/tenant-roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { TenantRolesGuard } from "../../../../common/guards/tenant-roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
/* eslint-disable no-restricted-imports -- TenantsModule imports WorkspaceModule */
import { SubscriptionsService } from "../../../subscriptions/application/subscriptions.service";
import { WorkspaceService } from "../../../workspace/application/workspace.service";
/* eslint-enable no-restricted-imports */
import { TenantAnalyticsService } from "../../application/tenant-analytics.service";
import { TenantWorkspaceAdminsOverviewService } from "../../application/tenant-workspace-admins-overview.service";
import { TenantsService } from "../../application/tenants.service";

@Controller()
@UseGuards(JwtAuthGuard, TenantRolesGuard)
export class TenantsController {
  constructor(
    private tenants: TenantsService,
    private tenantAnalytics: TenantAnalyticsService,
    private workspaceAdminsOverviewService: TenantWorkspaceAdminsOverviewService,
    private workspace: WorkspaceService,
    private subscriptions: SubscriptionsService
  ) {}

  @Get(ROUTES.TENANTS.CURRENT)
  getCurrent(@CurrentUser() user: RequestUser) {
    return this.tenants.getCurrent(user.userId, user.tenantId);
  }

  @TenantRoles("OWNER", "ADMIN")
  @Patch(ROUTES.TENANTS.CURRENT)
  updateCurrent(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateTenantCurrentSchema)) body: UpdateTenantCurrentDto
  ) {
    return this.tenants.updateCurrent(user.userId, user.tenantId, body);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.OVERVIEW)
  getOverview(@CurrentUser() user: RequestUser) {
    return this.tenants.getOverview(user.userId, user.tenantId);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.ANALYTICS_SUMMARY)
  getAnalyticsSummary(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(tenantAnalyticsQuerySchema)) query: TenantAnalyticsQueryDto
  ) {
    return this.tenantAnalytics.getSummary(user.userId, user.tenantId, query);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.SUBSCRIPTION)
  getSubscription(@CurrentUser() user: RequestUser) {
    return this.subscriptions.getSubscriptionForTenant(user.tenantId);
  }

  @TenantRoles("OWNER", "ADMIN")
  @Get(ROUTES.TENANTS.MEMBERS)
  listMembers(@CurrentUser() user: RequestUser) {
    return this.tenants.listMembers(user.userId, user.tenantId);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.MEMBERS)
  inviteMember(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(inviteTenantMemberSchema)) body: InviteTenantMemberDto
  ) {
    return this.tenants.inviteMember(user.userId, user.tenantId, body);
  }

  @TenantRoles("OWNER")
  @Patch(ROUTES.TENANTS.MEMBER(":id"))
  updateMember(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTenantMemberSchema)) body: UpdateTenantMemberDto
  ) {
    return this.tenants.updateMember(user.userId, user.tenantId, id, body);
  }

  @TenantRoles("OWNER", "ADMIN")
  @Get(ROUTES.TENANTS.WORKSPACE_ADMINS_OVERVIEW)
  workspaceAdminsOverview(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(workspaceAdminsOverviewQuerySchema))
    query: WorkspaceAdminsOverviewQuery
  ) {
    return this.workspaceAdminsOverviewService.getOverview(user.tenantId, query);
  }

  @TenantRoles("OWNER", "ADMIN")
  @Get(ROUTES.TENANTS.WORKSPACES)
  listWorkspaces(@CurrentUser() user: RequestUser) {
    return this.workspace.listForTenant(user.tenantId);
  }

  @TenantRoles("OWNER", "ADMIN")
  @Get(ROUTES.TENANTS.WORKSPACES_TREE)
  getWorkspacesTree(@CurrentUser() user: RequestUser) {
    return this.workspace.getWorkspacesTree(user.tenantId);
  }

  @TenantRoles("OWNER", "ADMIN")
  @Post(ROUTES.TENANTS.WORKSPACES)
  createWorkspace(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTenantWorkspaceSchema)) body: CreateTenantWorkspaceDto
  ) {
    return this.workspace.create(user.userId, body);
  }

  @TenantRoles("OWNER", "ADMIN")
  @Post(ROUTES.WORKSPACES.ASSIGN_ADMIN(":workspaceId"))
  assignWorkspaceAdmin(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(assignWorkspaceAdminSchema)) body: AssignWorkspaceAdminDto
  ) {
    return this.workspace.assignAdminAsTenantOwner(user.userId, user.tenantId, workspaceId, body);
  }

  @TenantRoles("OWNER", "ADMIN")
  @Patch(ROUTES.TENANTS.WORKSPACE_MEMBER(":workspaceId", ":memberId"))
  updateWorkspaceMember(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateWorkspaceMemberSchema)) body: UpdateWorkspaceMemberDto
  ) {
    return this.workspace.updateMemberAsTenantOperator(
      user.userId,
      user.tenantId,
      workspaceId,
      memberId,
      body
    );
  }

  @TenantRoles("OWNER", "ADMIN")
  @Delete(ROUTES.TENANTS.WORKSPACE_MEMBER(":workspaceId", ":memberId"))
  removeWorkspaceMember(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string
  ) {
    return this.workspace.removeMemberAsTenantOperator(
      user.userId,
      user.tenantId,
      workspaceId,
      memberId
    );
  }

  @TenantRoles("OWNER", "ADMIN")
  @Post(ROUTES.TENANTS.WORKSPACE_MEMBER_RESEND(":workspaceId", ":memberId"))
  resendWorkspaceMemberCredentials(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string
  ) {
    return this.workspace.resendMemberCredentialsAsTenantOperator(
      user.userId,
      user.tenantId,
      workspaceId,
      memberId
    );
  }
}
