import {
  inviteMemberSchema,
  updateWorkspaceSchema,
  createWorkspaceSchema,
  ROUTES
} from "@chronomint/contracts";
import { Controller, Get, Param, Post, Patch, Body, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { WorkspaceService } from "../../application/workspace.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkspaceController {
  constructor(private workspace: WorkspaceService) {}

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

  @Get(ROUTES.WORKSPACES.MEMBERS(":id"))
  members(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.workspace.listMembers(id);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.INVITE(":id"))
  invite(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: unknown,
    @CurrentUser() user: RequestUser
  ) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.workspace.invite(id, body as Parameters<WorkspaceService["invite"]>[1]);
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
