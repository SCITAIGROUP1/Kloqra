import { loginSchema, registerSchema, switchWorkspaceSchema, ROUTES } from "@chronomint/contracts";
import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
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
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { AuthService } from "../../application/auth.service";

const cookieSecure = process.env.NODE_ENV === "production";

@Controller()
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post(ROUTES.AUTH.REGISTER)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const session = await this.auth.register(body as Parameters<AuthService["register"]>[0]);
    this.setCookies(req, res, session);
    return {
      ...session,
      accessToken: this.auth.signAccessToken(
        session.user.id,
        session.workspaceId,
        session.workspaceRole
      )
    };
  }

  @Post(ROUTES.AUTH.LOGIN)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const session = await this.auth.login(body as Parameters<AuthService["login"]>[0]);
    this.setCookies(req, res, session);
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
    const { userId, workspaceId } = this.auth.verifyRefresh(refresh);
    const session = await this.auth.refreshSession(userId, workspaceId);
    if (!session) return { error: "No workspace" };
    const access = this.auth.signAccessToken(userId, session.workspaceId, session.workspaceRole);
    res.cookie(accessCookieName(scope), access, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure,
      maxAge: 15 * 60 * 1000
    });
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
    const session = await this.auth.switchWorkspace(user.userId, body.workspaceId);
    this.setCookies(req, res, session);
    return {
      ...session,
      accessToken: this.auth.signAccessToken(
        session.user.id,
        session.workspaceId,
        session.workspaceRole
      )
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(ROUTES.AUTH.ME)
  me(@CurrentUser() user: RequestUser) {
    return this.auth.getMe(user.userId, user.workspaceId);
  }

  @Delete(ROUTES.AUTH.LOGOUT)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const scope = getAuthScope(req);
    res.clearCookie(accessCookieName(scope));
    res.clearCookie(refreshCookieName(scope));
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    return { ok: true };
  }

  private setCookies(
    req: Request,
    res: Response,
    session: { user: { id: string }; workspaceId: string; workspaceRole: "ADMIN" | "MEMBER" }
  ) {
    const scope = getAuthScope(req);
    const access = this.auth.signAccessToken(
      session.user.id,
      session.workspaceId,
      session.workspaceRole
    );
    const refresh = this.auth.signRefreshToken(session.user.id, session.workspaceId);
    const cookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: cookieSecure
    };
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
