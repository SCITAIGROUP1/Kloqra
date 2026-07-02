import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TENANT_ROLES_KEY } from "../decorators/tenant-roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { resolveTenantRoleForUser, type TenantMemberRole } from "../tenant/tenant-context";

@Injectable()
export class TenantRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<TenantMemberRole[]>(
      TENANT_ROLES_KEY,
      context.getHandler()
    );
    const { user } = context.switchToHttp().getRequest();
    const tenantRole = await resolveTenantRoleForUser(this.prisma, user.userId, user.tenantId);
    if (!tenantRole) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Organization membership required"
      });
    }
    if (requiredRoles?.length && !requiredRoles.includes(tenantRole)) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Insufficient organization permissions"
      });
    }
    return true;
  }
}
