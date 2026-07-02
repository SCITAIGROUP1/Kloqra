import {
  loginSchema,
  signupSchema,
  setInitialPasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  switchWorkspaceSchema,
  completeImpersonationSchema,
  impersonateSchema,
  refreshSessionSchema,
  platform2faSetupEnableRequestSchema,
  completePlatform2faSetupSchema,
  ROUTES,
  ErrorCodes,
  type AuthSessionDto,
  type PlatformSessionDto
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpStatus
} from "@nestjs/common";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { type Response, type Request } from "express";
import { assertAllowedAuthOrigin } from "../../../../common/auth/allowed-origins";
import {
  accessCookieName,
  getAuthScope,
  refreshCookieName
} from "../../../../common/auth/auth-scope";
import { getClearCookieOpts, getCookieOpts } from "../../../../common/auth/cookie-options";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { DomainException } from "../../../../common/errors/domain.exception";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { SessionAuthGuard } from "../../../../common/guards/session-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { PlatformAuditService } from "../../../platform/application/platform-audit.service";
import { AuthService } from "../../application/auth.service";

function requireProductionAuthScope(req: Request): string {
  const scope = getAuthScope(req);
  if (scope === "client" || scope === "admin" || scope === "platform") return scope;
  if (process.env.NODE_ENV === "production") {
    throw new DomainException(
      ErrorCodes.UNAUTHORIZED,
      "X-Auth-Scope header required (client, admin, or platform)",
      HttpStatus.UNAUTHORIZED
    );
  }
  return scope;
}

function guardCookieAuthRequest(req: Request): void {
  assertAllowedAuthOrigin(req);
  requireProductionAuthScope(req);
}

@Controller()
export class AuthController {
  constructor(
    private auth: AuthService,
    private platformAudit: PlatformAuditService
  ) {}

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.REGISTER)
  register() {
    throw new DomainException(
      ErrorCodes.SELF_REGISTRATION_DISABLED,
      "Self-registration is disabled. Contact your workspace administrator.",
      HttpStatus.FORBIDDEN
    );
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.SIGNUP)
  async signup(@Body(new ZodValidationPipe(signupSchema)) body: unknown) {
    return this.auth.signup(body as Parameters<AuthService["signup"]>[0]);
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.LOGIN)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    guardCookieAuthRequest(req);
    const scope = getAuthScope(req);
    if (scope === "platform") {
      const result = await this.auth.loginPlatform(
        body as Parameters<AuthService["loginPlatform"]>[0]
      );
      if ("requires2fa" in result && result.requires2fa) {
        return result;
      }
      if ("requires2faSetup" in result && result.requires2faSetup) {
        return result;
      }
      const session = result as PlatformSessionDto;
      await this.platformAudit.recordEvent({
        context: {
          actorPlatformUserId: session.user.id,
          ipAddress: req.ip || req.socket.remoteAddress || undefined,
          userAgent: req.get("user-agent") ?? undefined
        },
        action: "platform.login",
        summary: { email: session.user.email }
      });
      const tokens = await this.setPlatformCookies(req, res, session);
      return { ...session, ...tokens };
    }
    const result = await this.auth.login(body as Parameters<AuthService["login"]>[0]);
    if ("requires2fa" in result && result.requires2fa) {
      return result;
    }
    if ("requiresPasswordChange" in result && result.requiresPasswordChange) {
      return result;
    }
    if ("requiresEmailVerification" in result && result.requiresEmailVerification) {
      return result;
    }
    const session = result as AuthSessionDto;
    const tokens = await this.setCookies(req, res, session);
    return { ...session, ...tokens };
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.SET_PASSWORD)
  async setPassword(
    @Body(new ZodValidationPipe(setInitialPasswordSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    guardCookieAuthRequest(req);
    const result = await this.auth.setInitialPassword(
      body as Parameters<AuthService["setInitialPassword"]>[0]
    );
    if ("requires2fa" in result && result.requires2fa) {
      return result;
    }
    if ("requiresEmailVerification" in result && result.requiresEmailVerification) {
      return result;
    }
    const session = result as AuthSessionDto;
    const tokens = await this.setCookies(req, res, session);
    return { ...session, ...tokens };
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.PLATFORM_2FA_SETUP_ENABLE)
  async enablePlatform2faSetup(
    @Body(new ZodValidationPipe(platform2faSetupEnableRequestSchema)) body: { pendingToken: string }
  ) {
    return this.auth.enablePlatform2faSetup(body.pendingToken);
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.PLATFORM_COMPLETE_2FA_SETUP)
  async completePlatform2faSetup(
    @Body(new ZodValidationPipe(completePlatform2faSetupSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    guardCookieAuthRequest(req);
    const session = await this.auth.completePlatform2faSetup(
      body as Parameters<AuthService["completePlatform2faSetup"]>[0]
    );
    await this.platformAudit.recordEvent({
      context: {
        actorPlatformUserId: session.user.id,
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        userAgent: req.get("user-agent") ?? undefined
      },
      action: "platform.2fa.enabled",
      summary: { email: session.user.email }
    });
    const tokens = await this.setPlatformCookies(req, res, session);
    return { ...session, ...tokens };
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.FORGOT_PASSWORD)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: { email: string },
    @Req() req: Request
  ) {
    const scope = getAuthScope(req);
    return this.auth.forgotPassword(body.email, scope === "platform" ? "platform" : undefined);
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.RESET_PASSWORD)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: { token: string; newPassword: string },
    @Req() req: Request
  ) {
    const scope = getAuthScope(req);
    return this.auth.resetPassword(
      body.token,
      body.newPassword,
      scope === "platform" ? "platform" : undefined
    );
  }

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post(ROUTES.AUTH.VERIFY_EMAIL)
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: { token: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    guardCookieAuthRequest(req);
    const result = await this.auth.verifyEmail(body.token);
    if ("requires2fa" in result && result.requires2fa) {
      return result;
    }
    if ("requiresPasswordChange" in result && result.requiresPasswordChange) {
      return result;
    }
    const session = result as AuthSessionDto;
    const tokens = await this.setCookies(req, res, session);
    return { ...session, ...tokens };
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.RESEND_VERIFICATION)
  async resendVerification(
    @Body(new ZodValidationPipe(resendVerificationSchema)) body: { email: string }
  ) {
    return this.auth.resendVerification(body.email);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(ROUTES.AUTH.REFRESH)
  async refresh(
    @Body(new ZodValidationPipe(refreshSessionSchema)) body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    guardCookieAuthRequest(req);
    const scope = getAuthScope(req);
    const refresh =
      req.cookies?.[refreshCookieName(scope)] ??
      req.cookies?.refresh_token ??
      body.refreshToken?.trim();
    if (!refresh) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "No refresh token provided",
        HttpStatus.UNAUTHORIZED
      );
    }

    if (scope === "platform") {
      const { session, newRefreshToken, family } = await this.auth.rotatePlatformRefreshToken(
        refresh,
        { userAgent: req.headers["user-agent"] }
      );
      if (!session) return { error: "No platform session" };
      const access = this.auth.signPlatformAccessToken(session.user.id, family);
      const cookieOpts = getCookieOpts();
      res.cookie(accessCookieName(scope), access, {
        ...cookieOpts,
        maxAge: 15 * 60 * 1000
      });
      if (newRefreshToken) {
        res.cookie(refreshCookieName(scope), newRefreshToken, {
          ...cookieOpts,
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }
      return {
        ...session,
        accessToken: access,
        ...(newRefreshToken ? { refreshToken: newRefreshToken } : {})
      };
    }

    const { session, newRefreshToken, family } = await this.auth.rotateRefreshToken(refresh, {
      userAgent: req.headers["user-agent"]
    });
    if (!session) return { error: "No workspace" };

    const tokenScope = scope === "client" || scope === "admin" ? scope : undefined;
    const access = this.auth.signAccessToken(
      session.user.id,
      session.workspaceId,
      session.workspaceRole,
      session.tenantId,
      session.impersonatorId,
      tokenScope,
      family
    );
    const cookieOpts = getCookieOpts();
    res.cookie(accessCookieName(scope), access, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    if (newRefreshToken) {
      res.cookie(refreshCookieName(scope), newRefreshToken, {
        ...cookieOpts,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }
    return {
      ...session,
      accessToken: access,
      ...(newRefreshToken ? { refreshToken: newRefreshToken } : {})
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.AUTH.SWITCH_WORKSPACE)
  async switchWorkspace(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(switchWorkspaceSchema)) body: { workspaceId: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const impersonatorId = user.impersonatorId;
    let impersonatorName: string | undefined;

    if (impersonatorId) {
      const imp = await this.auth.verifyImpersonator(impersonatorId, body.workspaceId);
      impersonatorName = imp.name;
    }

    const session = await this.auth.switchWorkspace(user.userId, body.workspaceId);
    const enrichedSession = {
      ...session,
      impersonatorId,
      impersonatorName
    };

    const tokens = await this.setCookies(req, res, enrichedSession, impersonatorId);
    return { ...enrichedSession, ...tokens };
  }

  @SkipThrottle()
  @UseGuards(SessionAuthGuard)
  @Get(ROUTES.AUTH.ME)
  me(
    @Req() req: Request,
    @CurrentUser() user?: RequestUser,
    @CurrentPlatformUser() platformUser?: PlatformRequestUser
  ) {
    const scope = getAuthScope(req);
    if (scope === "platform") {
      if (!platformUser) {
        throw new DomainException(
          ErrorCodes.UNAUTHORIZED,
          "Not authenticated",
          HttpStatus.UNAUTHORIZED
        );
      }
      return this.auth.getPlatformMe(platformUser.platformUserId);
    }
    if (!user) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Not authenticated",
        HttpStatus.UNAUTHORIZED
      );
    }
    return this.auth.getMe(user.userId, user.workspaceId, user.impersonatorId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.AUTH.IMPERSONATE)
  async impersonate(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(impersonateSchema)) body: { userId: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (user.role !== "ADMIN") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Only workspace administrators can view as another member",
        HttpStatus.FORBIDDEN
      );
    }

    const { session, handoffToken, accessToken, refreshToken } =
      await this.auth.createImpersonationHandoff(user.userId, user.workspaceId, body.userId);

    const clientScope = "client" as const;
    const cookieOpts = getCookieOpts();
    res.cookie(accessCookieName(clientScope), accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    res.cookie(refreshCookieName(clientScope), refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return { ...session, handoffToken };
  }

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post(ROUTES.AUTH.IMPERSONATE_COMPLETE)
  async completeImpersonation(
    @Body(new ZodValidationPipe(completeImpersonationSchema)) body: { handoffToken: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    guardCookieAuthRequest(req);
    const handoff = await this.auth.consumeImpersonationHandoff(body.handoffToken);
    if (!handoff) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Impersonation handoff expired or invalid",
        HttpStatus.UNAUTHORIZED
      );
    }

    const clientScope = "client" as const;
    const cookieOpts = getCookieOpts();
    res.cookie(accessCookieName(clientScope), handoff.accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    res.cookie(refreshCookieName(clientScope), handoff.refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return {
      ...handoff.session,
      accessToken: handoff.accessToken,
      refreshToken: handoff.refreshToken
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.AUTH.STOP_IMPERSONATION)
  async stopImpersonation(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    guardCookieAuthRequest(req);
    const refresh =
      req.cookies?.[refreshCookieName("client")] ??
      req.cookies?.refresh_token_client ??
      req.cookies?.refresh_token;
    if (refresh) {
      await this.auth.revokeRefreshToken(refresh);
    }
    const clearOpts = getClearCookieOpts();
    res.clearCookie(accessCookieName("client"), clearOpts);
    res.clearCookie(refreshCookieName("client"), clearOpts);
    res.clearCookie("access_token", clearOpts);
    res.clearCookie("refresh_token", clearOpts);
    return { ok: true };
  }

  @Delete(ROUTES.AUTH.LOGOUT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    guardCookieAuthRequest(req);
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token;
    if (refresh) {
      if (scope === "platform") {
        await this.auth.revokePlatformRefreshToken(refresh);
      } else {
        await this.auth.revokeRefreshToken(refresh);
      }
    }
    const clearOpts = getClearCookieOpts();
    res.clearCookie(accessCookieName(scope), clearOpts);
    res.clearCookie(refreshCookieName(scope), clearOpts);
    res.clearCookie("access_token", clearOpts);
    res.clearCookie("refresh_token", clearOpts);
    return { ok: true };
  }

  private sessionMetaFromRequest(req: Request) {
    return {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.socket.remoteAddress
    };
  }

  private async setCookies(
    req: Request,
    res: Response,
    session: {
      user: { id: string };
      tenantId: string;
      workspaceId: string;
      workspaceRole: "ADMIN" | "MEMBER";
    },
    impersonatorId?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const scope = requireProductionAuthScope(req);
    const tokenScope = scope === "client" || scope === "admin" ? scope : undefined;
    const issued = await this.auth.signAndStoreRefreshToken(
      session.user.id,
      session.workspaceId,
      undefined,
      impersonatorId,
      this.sessionMetaFromRequest(req),
      tokenScope
    );
    const access = this.auth.signAccessToken(
      session.user.id,
      session.workspaceId,
      session.workspaceRole,
      session.tenantId,
      impersonatorId,
      tokenScope,
      issued.family
    );
    const cookieOpts = getCookieOpts();
    res.cookie(accessCookieName(scope), access, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    res.cookie(refreshCookieName(scope), issued.raw, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return { accessToken: access, refreshToken: issued.raw };
  }

  private async setPlatformCookies(
    req: Request,
    res: Response,
    session: PlatformSessionDto
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const scope = requireProductionAuthScope(req);
    const issued = await this.auth.signAndStorePlatformRefreshToken(
      session.user.id,
      undefined,
      this.sessionMetaFromRequest(req)
    );
    const access = this.auth.signPlatformAccessToken(session.user.id, issued.family);
    const cookieOpts = getCookieOpts();
    res.cookie(accessCookieName(scope), access, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    res.cookie(refreshCookieName(scope), issued.raw, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return { accessToken: access, refreshToken: issued.raw };
  }
}
