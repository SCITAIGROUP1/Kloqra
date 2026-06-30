import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ProjectsService } from "../../application/projects.service";

@Controller()
export class TeamInvitesController {
  constructor(private projects: ProjectsService) {}

  @Get(ROUTES.TEAM_INVITES.PREVIEW(":token"))
  preview(@Param("token") token: string) {
    return this.projects.previewInvite(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.TEAM_INVITES.ACCEPT(":token"))
  accept(@Param("token") token: string, @CurrentUser() user: RequestUser) {
    return this.projects.acceptInviteForUser(token, user.userId);
  }
}
