import {
  loginSchema,
  registerSchema,
  switchWorkspaceSchema,
  impersonateSchema,
  ROUTES,
  ErrorCodes,
  type AuthSessionDto
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
import {
  accessCookieName,
  getAuthScope,
  refreshCookieName
} from "../../../../common/auth/auth-scope";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { DomainException } from "../../../../common/errors/domain.exception";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { AuthService } from "../../application/auth.service";

const cookieSecure = process.env.NODE_ENV === "production";
const cookieDomain = process.env.COOKIE_DOMAIN?.trim();

const getCookieOpts = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: cookieSecure,
  ...(cookieDomain ? { domain: cookieDomain } : {})
});

const getClearCookieOpts = () => ({
  ...(cookieDomain ? { domain: cookieDomain } : {})
});

@Controller()
export class AuthController {
  constructor(private auth: AuthService) {}

  // Strict rate limit: 5 attempts per 60 s — prevents credential-stuffing
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.REGISTER)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const session = await this.auth.register(body as Parameters<AuthService["register"]>[0]);
    await this.setCookies(req, res, session);
    return {
      ...session,
      accessToken: this.auth.signAccessToken(
        session.user.id,
        session.workspaceId,
        session.workspaceRole
      )
    };
  }

  // Strict rate limit: 5 attempts per 60 s — prevents brute-force attacks
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.LOGIN)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.auth.login(body as Parameters<AuthService["login"]>[0]);
    if ("requires2fa" in result && result.requires2fa) {
      return result;
    }
    const session = result as AuthSessionDto;
    await this.setCookies(req, res, session);
    return {
      ...session,
      accessToken: this.auth.signAccessToken(
        session.user.id,
        session.workspaceId,
        session.workspaceRole
      )
    };
  }

  @Post(ROUTES.AUTH.REFRESH)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token;
    if (!refresh) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "No refresh token provided",
        HttpStatus.UNAUTHORIZED
      );
    }
    const { session, newRefreshToken } = await this.auth.rotateRefreshToken(refresh);
    if (!session) return { error: "No workspace" };

    const access = this.auth.signAccessToken(
      session.user.id,
      session.workspaceId,
      session.workspaceRole,
      session.impersonatorId
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
    return { ...session, accessToken: access };
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

    await this.setCookies(req, res, enrichedSession, impersonatorId);
    return {
      ...enrichedSession,
      accessToken: this.auth.signAccessToken(
        enrichedSession.user.id,
        enrichedSession.workspaceId,
        enrichedSession.workspaceRole,
        impersonatorId
      )
    };
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get(ROUTES.AUTH.ME)
  me(@CurrentUser() user: RequestUser) {
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

    const { session, accessToken, refreshToken } = await this.auth.impersonate(
      user.userId,
      user.workspaceId,
      body.userId
    );

    const cookieOpts = getCookieOpts();
    res.cookie("access_token_client", accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    res.cookie("refresh_token_client", refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return { ...session, accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.AUTH.STOP_IMPERSONATION)
  async stopImpersonation(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token_client;
    if (refresh) {
      await this.auth.revokeRefreshToken(refresh);
    }
    const clearOpts = getClearCookieOpts();
    res.clearCookie("access_token_client", clearOpts);
    res.clearCookie("refresh_token_client", clearOpts);
    res.clearCookie("access_token", clearOpts);
    res.clearCookie("refresh_token", clearOpts);
    return { ok: true };
  }

  @SkipThrottle()
  @Delete(ROUTES.AUTH.LOGOUT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token;
    if (refresh) {
      await this.auth.revokeRefreshToken(refresh);
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
    session: { user: { id: string }; workspaceId: string; workspaceRole: "ADMIN" | "MEMBER" },
    impersonatorId?: string
  ) {
    const scope = getAuthScope(req);
    const access = this.auth.signAccessToken(
      session.user.id,
      session.workspaceId,
      session.workspaceRole,
      impersonatorId
    );
    const refresh = await this.auth.signAndStoreRefreshToken(
      session.user.id,
      session.workspaceId,
      undefined,
      impersonatorId,
      this.sessionMetaFromRequest(req)
    );
    const cookieOpts = getCookieOpts();
    res.cookie(accessCookieName(scope), access, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    res.cookie(refreshCookieName(scope), refresh, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }
}
