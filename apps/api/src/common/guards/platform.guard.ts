import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { PlatformJwtAuthGuard } from "./platform-jwt-auth.guard";

@Injectable()
export class PlatformGuard extends PlatformJwtAuthGuard implements CanActivate {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = await super.canActivate(context);
    if (!ok) return false;

    const req = context.switchToHttp().getRequest();
    if (req.platformUser?.platformRole !== "SUPERADMIN") {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Platform access required"
      });
    }
    return true;
  }
}

/** Reject tenant JWTs on platform routes when guard is not used. */
export function assertPlatformScopeHeader(scope: string): void {
  if (scope !== "platform") {
    throw new UnauthorizedException({
      code: ErrorCodes.UNAUTHORIZED,
      message: "Platform scope required"
    });
  }
}
