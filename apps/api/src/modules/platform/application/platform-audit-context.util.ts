import type { Request } from "express";
import type { PlatformRequestUser } from "../../../common/decorators/current-platform-user.decorator";
import type { PlatformAuditContext } from "./platform-audit.service";

export function platformAuditContextFromRequest(
  user: PlatformRequestUser,
  req: Request
): PlatformAuditContext {
  return {
    actorPlatformUserId: user.platformUserId,
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get("user-agent") ?? undefined
  };
}
