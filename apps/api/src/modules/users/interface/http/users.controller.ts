import {
  changePasswordSchema,
  dashboardLayoutQuerySchema,
  ErrorCodes,
  ROUTES,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  setUserProjectColorSchema,
  twoFactorDisableSchema,
  twoFactorVerifySchema,
  updateDashboardLayoutSchema,
  updateUserPreferencesSchema,
  updateUserProfileSchema
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { refreshCookieName, getAuthScope } from "../../../../common/auth/auth-scope";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { DomainException } from "../../../../common/errors/domain.exception";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { Users2faService } from "../../application/users-2fa.service";
import { UsersSessionsService } from "../../application/users-sessions.service";
import { UsersService } from "../../application/users.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private users: UsersService,
    private sessions: UsersSessionsService,
    private twoFa: Users2faService
  ) {}

  @Get(ROUTES.USERS.ME)
  getMe(@CurrentUser() user: RequestUser) {
    return this.users.getProfile(user.userId, user.workspaceId, user.role);
  }

  @Patch(ROUTES.USERS.ME)
  updateMe(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateUserProfileSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.users.updateProfile(
      user.userId,
      user.workspaceId,
      body as Parameters<UsersService["updateProfile"]>[2],
      user.role
    );
  }

  @Get(ROUTES.USERS.DASHBOARD_LAYOUT)
  getDashboardLayout(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(dashboardLayoutQuerySchema)) query: { app: "client" | "admin" }
  ) {
    return this.users.getDashboardLayout(user.userId, user.workspaceId, query.app);
  }

  @Put(ROUTES.USERS.DASHBOARD_LAYOUT)
  updateDashboardLayout(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateDashboardLayoutSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.users.updateDashboardLayout(
      user.userId,
      user.workspaceId,
      body as Parameters<UsersService["updateDashboardLayout"]>[2]
    );
  }

  @Patch(ROUTES.USERS.PREFERENCES)
  updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateUserPreferencesSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.users.updatePreferences(
      user.userId,
      user.workspaceId,
      body as Parameters<UsersService["updatePreferences"]>[2],
      user.role
    );
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.USERS.PASSWORD)
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.users.changePassword(
      user.userId,
      body as Parameters<UsersService["changePassword"]>[1]
    );
  }

  @Get(ROUTES.USERS.SESSIONS)
  listSessions(@CurrentUser() user: RequestUser, @Req() req: Request) {
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token;
    return this.sessions.listSessions(user.userId, refresh);
  }

  @Delete(ROUTES.USERS.SESSION(":id"))
  revokeSession(@CurrentUser() user: RequestUser, @Param("id") sessionId: string) {
    this.assertNotImpersonating(user);
    return this.sessions.revokeSession(user.userId, sessionId);
  }

  @Post(ROUTES.USERS.REVOKE_OTHER_SESSIONS)
  revokeOtherSessions(@CurrentUser() user: RequestUser, @Req() req: Request) {
    this.assertNotImpersonating(user);
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token;
    return this.sessions.revokeOtherSessions(user.userId, refresh);
  }

  @Post(ROUTES.USERS.TWO_FA_ENABLE)
  enable2fa(@CurrentUser() user: RequestUser) {
    this.assertNotImpersonating(user);
    return this.users
      .getProfile(user.userId, user.workspaceId, user.role)
      .then((profile) => this.twoFa.enable(user.userId, profile.email));
  }

  @Post(ROUTES.USERS.TWO_FA_VERIFY)
  verify2fa(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(twoFactorVerifySchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.twoFa.verify(user.userId, body as Parameters<Users2faService["verify"]>[1]);
  }

  @Put(ROUTES.USERS.PROJECT_COLOR(":projectId"))
  setProjectColor(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(setUserProjectColorSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.users.setProjectColor(
      user.userId,
      user.workspaceId,
      projectId,
      body as Parameters<UsersService["setProjectColor"]>[3]
    );
  }

  @Delete(ROUTES.USERS.PROJECT_COLOR(":projectId"))
  clearProjectColor(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    this.assertNotImpersonating(user);
    return this.users.clearProjectColor(user.userId, user.workspaceId, projectId);
  }

  @Post(ROUTES.USERS.TWO_FA_DISABLE)
  disable2fa(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(twoFactorDisableSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.twoFa.disable(user.userId, body as Parameters<Users2faService["disable"]>[1]);
  }

  @Post(ROUTES.USERS.PHONE_SEND_OTP)
  sendPhoneOtp(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(sendPhoneOtpSchema)) body: any
  ) {
    this.assertNotImpersonating(user);
    return this.users.sendPhoneOtp(user.userId, user.workspaceId, body.phone, user.role);
  }

  @Post(ROUTES.USERS.PHONE_VERIFY_OTP)
  verifyPhoneOtp(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(verifyPhoneOtpSchema)) body: any
  ) {
    this.assertNotImpersonating(user);
    return this.users.verifyPhoneOtp(user.userId, user.workspaceId, body.code, user.role);
  }

  private assertNotImpersonating(user: RequestUser) {
    if (user.impersonatorId) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Cannot modify account while impersonating",
        HttpStatus.FORBIDDEN
      );
    }
  }
}
