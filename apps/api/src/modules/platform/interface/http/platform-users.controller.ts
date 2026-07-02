import {
  changePlatformPasswordSchema,
  ROUTES,
  twoFactorDisableSchema,
  twoFactorVerifySchema,
  updatePlatformPreferencesSchema,
  updatePlatformUserProfileSchema
} from "@kloqra/contracts";
import { Body, Controller, Delete, Get, Patch, Post, Param, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { refreshCookieName, getAuthScope } from "../../../../common/auth/auth-scope";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformGuard } from "../../../../common/guards/platform.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { platformAuditContextFromRequest } from "../../application/platform-audit-context.util";
import { PlatformAuditService } from "../../application/platform-audit.service";
import { PlatformUsers2faService } from "../../application/platform-users-2fa.service";
import { PlatformUsersSessionsService } from "../../application/platform-users-sessions.service";
import { PlatformUsersService } from "../../application/platform-users.service";

@Controller()
@UseGuards(PlatformGuard)
export class PlatformUsersController {
  constructor(
    private users: PlatformUsersService,
    private sessions: PlatformUsersSessionsService,
    private twoFa: PlatformUsers2faService,
    private platformAudit: PlatformAuditService
  ) {}

  @Get(ROUTES.PLATFORM.ME)
  getMe(@CurrentPlatformUser() user: PlatformRequestUser) {
    return this.users.getProfile(user.platformUserId);
  }

  @Patch(ROUTES.PLATFORM.ME)
  updateMe(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Body(new ZodValidationPipe(updatePlatformUserProfileSchema)) body: unknown
  ) {
    return this.users.updateProfile(
      user.platformUserId,
      body as Parameters<PlatformUsersService["updateProfile"]>[1]
    );
  }

  @Patch(ROUTES.PLATFORM.ME_PREFERENCES)
  updatePreferences(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Body(new ZodValidationPipe(updatePlatformPreferencesSchema)) body: unknown
  ) {
    return this.users.updatePreferences(
      user.platformUserId,
      body as Parameters<PlatformUsersService["updatePreferences"]>[1]
    );
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.PLATFORM.ME_PASSWORD)
  changePassword(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Body(new ZodValidationPipe(changePlatformPasswordSchema)) body: unknown
  ) {
    return this.users.changePassword(
      user.platformUserId,
      body as Parameters<PlatformUsersService["changePassword"]>[1]
    );
  }

  @Get(ROUTES.PLATFORM.ME_SESSIONS)
  listSessions(@CurrentPlatformUser() user: PlatformRequestUser, @Req() req: Request) {
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token_platform;
    return this.sessions.listSessions(user.platformUserId, refresh);
  }

  @Delete(ROUTES.PLATFORM.ME_SESSION(":id"))
  revokeSession(@CurrentPlatformUser() user: PlatformRequestUser, @Param("id") sessionId: string) {
    return this.sessions.revokeSession(user.platformUserId, sessionId);
  }

  @Post(ROUTES.PLATFORM.ME_SESSIONS_REVOKE_OTHERS)
  revokeOtherSessions(@CurrentPlatformUser() user: PlatformRequestUser, @Req() req: Request) {
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token_platform;
    return this.sessions.revokeOtherSessions(user.platformUserId, refresh);
  }

  @Post(ROUTES.PLATFORM.ME_2FA_ENABLE)
  enable2fa(@CurrentPlatformUser() user: PlatformRequestUser) {
    return this.users
      .getProfile(user.platformUserId)
      .then((profile) => this.twoFa.enable(user.platformUserId, profile.email));
  }

  @Post(ROUTES.PLATFORM.ME_2FA_VERIFY)
  async verify2fa(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Body(new ZodValidationPipe(twoFactorVerifySchema)) body: unknown,
    @Req() req: Request
  ) {
    const result = await this.twoFa.verify(
      user.platformUserId,
      body as Parameters<PlatformUsers2faService["verify"]>[1]
    );
    await this.platformAudit.recordEvent({
      context: platformAuditContextFromRequest(user, req),
      action: "platform.2fa.enabled",
      summary: { platformUserId: user.platformUserId }
    });
    return result;
  }

  @Post(ROUTES.PLATFORM.ME_2FA_DISABLE)
  async disable2fa(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Body(new ZodValidationPipe(twoFactorDisableSchema)) body: unknown,
    @Req() req: Request
  ) {
    const result = await this.twoFa.disable(
      user.platformUserId,
      body as Parameters<PlatformUsers2faService["disable"]>[1]
    );
    await this.platformAudit.recordEvent({
      context: platformAuditContextFromRequest(user, req),
      action: "platform.2fa.disabled",
      summary: { platformUserId: user.platformUserId }
    });
    return result;
  }
}
