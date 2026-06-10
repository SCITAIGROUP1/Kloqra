import {
  createProjectSchema,
  listProjectsQuerySchema,
  listProjectTeamQuerySchema,
  updateProjectSchema,
  updateTeamMemberSchema,
  createTeamInviteSchema,
  type ListProjectsQuery,
  type ListProjectTeamQuery,
  ROUTES
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
import { Roles } from "../../../../common/decorators/roles.decorator";
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
    @Query(new ZodValidationPipe(listProjectsQuerySchema)) query: ListProjectsQuery
  ) {
    return this.projects.list(user.workspaceId, user.userId, user.role, query);
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

  @Roles("ADMIN")
  @Get(ROUTES.PROJECTS.TEAM(":id"))
  getTeam(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(listProjectTeamQuerySchema)) query: ListProjectTeamQuery
  ) {
    return this.projects.getTeam(user.workspaceId, id, query);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.PROJECTS.TEAM_MEMBER(":projectId", ":memberId"))
  updateTeamMember(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateTeamMemberSchema)) body: unknown
  ) {
    const { isActive } = body as { isActive: boolean };
    return this.projects.updateTeamMember(user.workspaceId, projectId, memberId, isActive);
  }

  @Roles("ADMIN")
  @Delete(ROUTES.PROJECTS.TEAM_MEMBER(":projectId", ":memberId"))
  removeTeamMember(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("memberId") memberId: string
  ) {
    return this.projects.removeTeamMember(user.workspaceId, projectId, memberId);
  }

  @Roles("ADMIN")
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
      body as Parameters<ProjectsService["createTeamInvite"]>[3]
    );
  }
}
