import {
  addTeamMemberSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  listProjectTeamQuerySchema,
  updateProjectSchema,
  updateTeamMemberSchema,
  createTeamInviteSchema,
  type ListProjectsQuery,
  type ListProjectTeamQuery,
  type UpdateTeamMemberDto,
  ROUTES
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { Roles } from "../../../../common/decorators/roles.decorator";
import { AdminOrProjectManagerGuard } from "../../../../common/guards/admin-or-project-manager.guard";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { ProjectsService } from "../../application/projects.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get(ROUTES.PROJECTS.LIST)
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listProjectsQuerySchema)) query: ListProjectsQuery,
    @Headers("x-auth-scope") authScope?: string
  ) {
    return this.projects.list(user.workspaceId, user.userId, user.role, query, {
      adminScope: authScope === "admin",
      managedProjectIds: user.managedProjectIds
    });
  }

  @Roles("ADMIN")
  @Post(ROUTES.PROJECTS.CREATE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createProjectSchema)) body: unknown
  ) {
    return this.projects.create(user.workspaceId, body as Parameters<ProjectsService["create"]>[1]);
  }

  @Get(ROUTES.PROJECTS.BY_ID(":id"))
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projects.get(user.workspaceId, user.userId, user.role, id);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.PROJECTS.BY_ID(":id"))
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: unknown
  ) {
    return this.projects.update(
      user.workspaceId,
      id,
      body as Parameters<ProjectsService["update"]>[2]
    );
  }

  @Roles("ADMIN")
  @Delete(ROUTES.PROJECTS.BY_ID(":id"))
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projects.remove(user.workspaceId, id);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Get(ROUTES.PROJECTS.TEAM(":id"))
  getTeam(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(listProjectTeamQuerySchema)) query: ListProjectTeamQuery
  ) {
    return this.projects.getTeam(user.workspaceId, user.userId, user.role, id, query);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Post(ROUTES.PROJECTS.TEAM_MEMBERS(":id"))
  addTeamMember(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addTeamMemberSchema)) body: unknown
  ) {
    return this.projects.addTeamMember(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      body as Parameters<ProjectsService["addTeamMember"]>[4]
    );
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Patch(ROUTES.PROJECTS.TEAM_MEMBER(":projectId", ":memberId"))
  updateTeamMember(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateTeamMemberSchema)) body: UpdateTeamMemberDto
  ) {
    return this.projects.updateTeamMember(
      user.workspaceId,
      projectId,
      memberId,
      body,
      user.role,
      user.userId
    );
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Delete(ROUTES.PROJECTS.TEAM_MEMBER(":projectId", ":memberId"))
  removeTeamMember(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("memberId") memberId: string
  ) {
    return this.projects.removeTeamMember(
      user.workspaceId,
      user.userId,
      user.role,
      projectId,
      memberId
    );
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Post(ROUTES.PROJECTS.TEAM_INVITES(":id"))
  createTeamInvite(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createTeamInviteSchema)) body: unknown
  ) {
    return this.projects.createTeamInvite(
      user.workspaceId,
      id,
      user.userId,
      body as Parameters<ProjectsService["createTeamInvite"]>[3],
      user.role
    );
  }
}
