import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface PlatformRequestUser {
  platformUserId: string;
  platformRole: "SUPERADMIN" | "SUPPORT";
}

export const CurrentPlatformUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PlatformRequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.platformUser;
  }
);
