import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { AuthRevocationService } from "../auth/auth-revocation.service";
import { accessCookieName, getAuthScope } from "../auth/auth-scope";
import { JwtTokenService } from "../auth/jwt-token.service";

@Injectable()
export class PlatformJwtAuthGuard implements CanActivate {
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
    const cookieToken =
      req.cookies?.[accessCookieName(scope)] || req.cookies?.access_token_platform || null;

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
      const payload = this.jwtTokens.verifyPlatformAccessToken(token);
      await this.authRevocation.assertNotRevoked(payload.sub, payload.family);
      req.platformUser = this.jwtTokens.toPlatformRequestUser(payload);
      return true;
    } catch (err: unknown) {
      if (
        err instanceof ForbiddenException ||
        err instanceof UnauthorizedException ||
        err instanceof HttpException
      ) {
        throw err;
      }
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Invalid token",
        details: { reason: "token_invalid" }
      });
    }
  }
}
