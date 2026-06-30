import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { AuthRevocationService } from "../auth/auth-revocation.service";
import { accessCookieName, getAuthScope } from "../auth/auth-scope";
import { JwtTokenService } from "../auth/jwt-token.service";
import { resolveWorkspaceId } from "../auth/resolve-workspace-id";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtTokens: JwtTokenService,
    private authRevocation: AuthRevocationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const bearer =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;
    const scope = getAuthScope(req);
    const cookieToken = req.cookies?.[accessCookieName(scope)] || req.cookies?.access_token || null;

    const expectedScope = scope === "client" || scope === "admin" ? scope : undefined;

    let token: string | null = null;
    if (bearer && !this.jwtTokens.isTokenExpired(bearer)) {
      token = bearer;
    } else if (cookieToken && !this.jwtTokens.isTokenExpired(cookieToken)) {
      token = cookieToken;
    } else if (bearer && this.jwtTokens.isTokenExpired(bearer)) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Access token expired",
        details: { reason: "token_expired" }
      });
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Not authenticated"
      });
    }

    try {
      const payload = this.jwtTokens.verifyAccessToken(token, expectedScope);
      await this.authRevocation.assertNotRevoked(payload.sub, payload.family);
      const headerWs = req.headers["x-workspace-id"];
      const headerValue = Array.isArray(headerWs) ? headerWs[0] : headerWs;
      const workspaceId = resolveWorkspaceId(payload.workspaceId, headerValue);
      req.user = this.jwtTokens.toRequestUser(payload, workspaceId);
      return true;
    } catch (err: unknown) {
      if (err instanceof ForbiddenException || err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Invalid token",
        details: { reason: "token_invalid" }
      });
    }
  }
}
