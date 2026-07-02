import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import type { RequestUser } from "../decorators/current-user.decorator";

/**
 * Ensures that if the route has an `:id` parameter (representing workspaceId),
 * it exactly matches the workspaceId from the user's JWT token.
 * Prevents accessing another workspace's routes using a valid token for a different workspace.
 */
@Injectable()
export class WorkspaceMatchGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Authentication required"
      });
    }

    const routeWorkspaceId = req.params.id;
    if (routeWorkspaceId && routeWorkspaceId !== user.workspaceId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Forbidden"
      });
    }

    return true;
  }
}
