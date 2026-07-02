import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface RequestUser {
  userId: string;
  tenantId: string;
  workspaceId: string;
  role: "ADMIN" | "MEMBER";
  managedProjectIds?: string[];
  impersonatorId?: string;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  }
);
