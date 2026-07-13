import {
  inviteMemberSchema,
  updateWorkspaceSchema,
  updateWorkspaceMemberSchema,
  createWorkspaceSchema,
  bulkInviteMemberSchema,
  teamMembersOverviewQuerySchema,
  projectManagersOverviewQuerySchema,
  type InviteMemberDto,
  type TeamMembersOverviewQuery,
  type ProjectManagersOverviewQuery,
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
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { Roles } from "../../../../common/decorators/roles.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { WorkspaceMatchGuard } from "../../../../common/guards/workspace-match.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { WorkspaceMembersOverviewService } from "../../application/workspace-members-overview.service";
import { WorkspaceProjectManagersOverviewService } from "../../application/workspace-project-managers-overview.service";
import { WorkspaceService } from "../../application/workspace.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceMatchGuard)
export class WorkspaceController {
  constructor(
    private workspace: WorkspaceService,
    private overviewService: WorkspaceMembersOverviewService,
    private projectManagersOverviewService: WorkspaceProjectManagersOverviewService
  ) {}

  @Post(ROUTES.WORKSPACES.CREATE)
  create(
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: unknown,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.create(_user.userId, body as Parameters<WorkspaceService["create"]>[1]);
  }

  @Get(ROUTES.WORKSPACES.LIST)
  list(@WorkspaceUser() _user: WorkspaceRequestUser) {
    return this.workspace.listForUser(_user.userId);
  }

  @Roles("ADMIN")
  @Get(ROUTES.WORKSPACES.MEMBERS_OVERVIEW(":id"))
  membersOverview(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(teamMembersOverviewQuerySchema)) query: TeamMembersOverviewQuery,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.overviewService.getOverview(id, query);
  }

  @Roles("ADMIN")
  @Get(ROUTES.WORKSPACES.PROJECT_MANAGERS_OVERVIEW(":id"))
  projectManagersOverview(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(projectManagersOverviewQuerySchema))
    query: ProjectManagersOverviewQuery,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.projectManagersOverviewService.getOverview(id, query);
  }

  @Get(ROUTES.WORKSPACES.MEMBERS(":id"))
  members(@Param("id") id: string, @WorkspaceUser() _user: WorkspaceRequestUser) {
    return this.workspace.listMembers(id);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.WORKSPACES.MEMBER(":id", ":memberId"))
  updateMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateWorkspaceMemberSchema)) body: unknown,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.updateMember(
      id,
      memberId,
      body as Parameters<WorkspaceService["updateMember"]>[2],
      _user.userId
    );
  }

  @Roles("ADMIN")
  @Delete(ROUTES.WORKSPACES.MEMBER(":id", ":memberId"))
  removeMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.removeMember(id, memberId, _user.userId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.INVITE(":id"))
  invite(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: unknown,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.invite(
      id,
      body as Parameters<WorkspaceService["invite"]>[1],
      _user.userId
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.WORKSPACES.BULK_MEMBERS_TEMPLATE(":id"))
  async getBulkInviteTemplate(
    @Param("id") id: string,
    @WorkspaceUser() _user: WorkspaceRequestUser,
    @Res() res: Response
  ) {
    await this.workspace.generateBulkInviteTemplate(res);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.BULK_MEMBERS_UPLOAD(":id"))
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  async bulkInviteUpload(
    @Param("id") id: string,
    @UploadedFile() file: any,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    if (!file) throw new Error("No file uploaded");

    const members = await this.workspace.parseBulkInviteExcel(file.buffer);
    return this.workspace.bulkInvite(id, members, _user.userId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.BULK_MEMBERS(":id"))
  async bulkInvite(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(bulkInviteMemberSchema)) body: { members: InviteMemberDto[] },
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.bulkInvite(id, body.members, _user.userId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.RESEND_CREDENTIALS(":id", ":memberId"))
  resendCredentials(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.resendMemberCredentials(id, memberId);
  }

  @Roles("ADMIN")
  @Get(ROUTES.WORKSPACES.BY_ID(":id"))
  getById(@Param("id") id: string, @WorkspaceUser() _user: WorkspaceRequestUser) {
    return this.workspace.getById(id);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.WORKSPACES.BY_ID(":id"))
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: any,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.update(id, body);
  }
}
