import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import type { RequestUser } from "../decorators/current-user.decorator";

@Injectable()
export class AdminOrProjectManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Insufficient permissions"
      });
    }
    if (user.role === "ADMIN") {
      return true;
    }

    if (user.managedProjectIds && user.managedProjectIds.length > 0) {
      // If the route has a specific project ID, verify they lead this exact project
      const projectId =
        req.params.projectId ||
        (req.route.path.includes("/projects/") ? req.params.id : null) ||
        req.body?.projectId;

      if (projectId) {
        if (user.managedProjectIds.includes(projectId)) {
          return true;
        } else {
          throw new ForbiddenException({
            code: ErrorCodes.FORBIDDEN,
            message: "You are not a project manager for this project"
          });
        }
      }

      // If no specific project ID is in the request (e.g. collection endpoints),
      // allow entry and rely on service-layer filtering
      return true;
    }

    throw new ForbiddenException({
      code: ErrorCodes.FORBIDDEN,
      message: "Insufficient permissions"
    });
  }
}
