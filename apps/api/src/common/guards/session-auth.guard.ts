import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { getAuthScope } from "../auth/auth-scope";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PlatformJwtAuthGuard } from "./platform-jwt-auth.guard";

/** Routes that accept either tenant or platform sessions (e.g. GET /auth/me). */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private jwtAuth: JwtAuthGuard,
    private platformJwtAuth: PlatformJwtAuthGuard
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (getAuthScope(req) === "platform") {
      return this.platformJwtAuth.canActivate(context);
    }
    return this.jwtAuth.canActivate(context);
  }
}
