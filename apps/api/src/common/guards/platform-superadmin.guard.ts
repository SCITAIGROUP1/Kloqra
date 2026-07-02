import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { PlatformGuard } from "./platform.guard";

@Injectable()
export class PlatformSuperadminGuard extends PlatformGuard implements CanActivate {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = await super.canActivate(context);
    if (!ok) return false;

    const req = context.switchToHttp().getRequest();
    if (req.platformUser?.platformRole !== "SUPERADMIN") {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Platform admin access required"
      });
    }
    return true;
  }
}
