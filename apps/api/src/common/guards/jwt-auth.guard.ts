import { ErrorCodes } from "@chronomint/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { accessCookieName, getAuthScope } from "../auth/auth-scope";
import { resolveWorkspaceId } from "../auth/resolve-workspace-id";
import type { RequestUser } from "../decorators/current-user.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const bearer =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;
    const scope = getAuthScope(req);
    const token = bearer || req.cookies?.[accessCookieName(scope)] || req.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Not authenticated"
      });
    }

    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET
      }) as RequestUser & { sub: string };
      const headerWs = req.headers["x-workspace-id"];
      const headerValue = Array.isArray(headerWs) ? headerWs[0] : headerWs;
      const workspaceId = resolveWorkspaceId(payload.workspaceId, headerValue);
      req.user = {
        userId: payload.sub ?? payload.userId,
        workspaceId,
        role: payload.role,
        impersonatorId: (payload as any).impersonatorId
      };
      return true;
    } catch (err: unknown) {
      if (err instanceof ForbiddenException || err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({ code: ErrorCodes.UNAUTHORIZED, message: "Invalid token" });
    }
  }
}
