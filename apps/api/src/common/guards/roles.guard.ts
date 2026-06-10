import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ForbiddenException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<("ADMIN" | "MEMBER")[]>(ROLES_KEY, context.getHandler());
    if (!roles?.length) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!roles.includes(user.role)) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Insufficient permissions"
      });
    }
    return true;
  }
}
