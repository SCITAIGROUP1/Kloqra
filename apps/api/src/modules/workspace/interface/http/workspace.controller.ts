import {
  inviteMemberSchema,
  updateWorkspaceSchema,
  updateWorkspaceMemberSchema,
  createWorkspaceSchema,
  teamMembersOverviewQuerySchema,
  type TeamMembersOverviewQuery,
  ROUTES
} from "@kloqra/contracts";
import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { WorkspaceMembersOverviewService } from "../../application/workspace-members-overview.service";
import { WorkspaceService } from "../../application/workspace.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkspaceController {
  constructor(
    private workspace: WorkspaceService,
    private overviewService: WorkspaceMembersOverviewService
  ) {}

  @Post(ROUTES.WORKSPACES.CREATE)
  create(
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: unknown,
    @CurrentUser() user: RequestUser
  ) {
    return this.workspace.create(user.userId, body as Parameters<WorkspaceService["create"]>[1]);
  }

  @Get(ROUTES.WORKSPACES.LIST)
  list(@CurrentUser() user: RequestUser) {
    return this.workspace.listForUser(user.userId);
  }

  @Roles("ADMIN")
  @Get(ROUTES.WORKSPACES.MEMBERS_OVERVIEW(":id"))
  membersOverview(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(teamMembersOverviewQuerySchema)) query: TeamMembersOverviewQuery,
    @CurrentUser() user: RequestUser
  ) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.overviewService.getOverview(id, query);
  }

  @Get(ROUTES.WORKSPACES.MEMBERS(":id"))
  members(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.workspace.listMembers(id);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.WORKSPACES.MEMBER(":id", ":memberId"))
  updateMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateWorkspaceMemberSchema)) body: unknown,
    @CurrentUser() user: RequestUser
  ) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.workspace.updateMember(
      id,
      memberId,
      body as Parameters<WorkspaceService["updateMember"]>[2],
      user.userId
    );
  }

  @Roles("ADMIN")
  @Delete(ROUTES.WORKSPACES.MEMBER(":id", ":memberId"))
  removeMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: RequestUser
  ) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.workspace.removeMember(id, memberId, user.userId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.INVITE(":id"))
  invite(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: unknown,
    @CurrentUser() user: RequestUser
  ) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.workspace.invite(
      id,
      body as Parameters<WorkspaceService["invite"]>[1],
      user.userId
    );
  }

  @Roles("ADMIN")
  @Patch(ROUTES.WORKSPACES.BY_ID(":id"))
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: any,
    @CurrentUser() user: RequestUser
  ) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.workspace.update(id, body);
  }
}
