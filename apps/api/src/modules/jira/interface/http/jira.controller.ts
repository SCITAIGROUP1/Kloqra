import {
  ROUTES,
  updateJiraCredentialsSchema,
  verifyUserJiraSchema,
  verifyWorkspaceJiraSchema,
  type UpdateJiraCredentialsDto,
  type VerifyUserJiraDto,
  type VerifyWorkspaceJiraDto
} from "@kloqra/contracts";
import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { JiraService } from "../../application/jira.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class JiraController {
  constructor(private jira: JiraService) {}

  @Get(ROUTES.JIRA.MY_ISSUES)
  getMyIssues(@CurrentUser() user: RequestUser) {
    return this.jira.getMyIssues(user.userId, user.workspaceId);
  }

  @Patch(ROUTES.JIRA.CREDENTIALS)
  updateCredentials(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateJiraCredentialsSchema)) body: unknown
  ) {
    return this.jira.updateCredentials(user.userId, body as UpdateJiraCredentialsDto);
  }

  @Roles("ADMIN")
  @Post(ROUTES.JIRA.VERIFY)
  verifyWorkspaceCredentials(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(verifyWorkspaceJiraSchema)) body: unknown
  ) {
    return this.jira.verifyWorkspaceCredentials(user.workspaceId, body as VerifyWorkspaceJiraDto);
  }

  @Post(ROUTES.JIRA.VERIFY_USER)
  verifyUserEmail(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(verifyUserJiraSchema)) body: unknown
  ) {
    return this.jira.verifyUserEmail(user.workspaceId, body as VerifyUserJiraDto);
  }
}
