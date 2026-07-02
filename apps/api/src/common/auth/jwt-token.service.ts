import { ErrorCodes } from "@kloqra/contracts";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { PlatformRequestUser } from "../decorators/current-platform-user.decorator";
import type { RequestUser } from "../decorators/current-user.decorator";

export type AuthTokenFailureReason =
  | "token_expired"
  | "token_invalid"
  | "token_malformed"
  | "token_wrong_type"
  | "missing_claims"
  | "scope_mismatch";

export interface VerifiedPlatformAccessPayload {
  sub: string;
  platformUserId: string;
  platformRole: "SUPERADMIN";
  scope: "platform";
  family?: string;
}

export interface VerifiedAccessPayload {
  sub: string;
  userId: string;
  tenantId: string;
  workspaceId: string;
  role: "ADMIN" | "MEMBER";
  impersonatorId?: string;
  scope?: "client" | "admin";
  family?: string;
}

function decodeExp(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { exp?: number };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

@Injectable()
export class JwtTokenService {
  private readonly logger = new Logger(JwtTokenService.name);

  constructor(private jwt: JwtService) {}

  isTokenExpired(token: string): boolean {
    const exp = decodeExp(token);
    if (exp === null) return false;
    return exp * 1000 <= Date.now();
  }

  verifyAccessToken(token: string, expectedScope?: "client" | "admin"): VerifiedAccessPayload {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Auth not configured",
        details: { reason: "token_invalid" as AuthTokenFailureReason }
      });
    }

    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify(token, { secret }) as Record<string, unknown>;
    } catch (err: unknown) {
      const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
      let reason: AuthTokenFailureReason = "token_invalid";
      let message = "Invalid token";
      if (name === "TokenExpiredError") {
        reason = "token_expired";
        message = "Access token expired";
      } else if (name === "JsonWebTokenError") {
        const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "";
        reason = msg.toLowerCase().includes("malformed") ? "token_malformed" : "token_invalid";
        message = reason === "token_malformed" ? "Malformed token" : "Invalid token";
      }
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message,
        details: { reason }
      });
    }

    const typ = payload.typ;
    if (typ === "refresh") {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Wrong token type",
        details: { reason: "token_wrong_type" as AuthTokenFailureReason }
      });
    }
    if (typ !== undefined && typ !== "access") {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Wrong token type",
        details: { reason: "token_wrong_type" as AuthTokenFailureReason }
      });
    }
    if (typ === undefined) {
      this.logger.warn("Access token missing typ claim — legacy token accepted");
    }

    const sub = typeof payload.sub === "string" ? payload.sub : undefined;
    const tenantId = typeof payload.tenantId === "string" ? payload.tenantId : undefined;
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId : undefined;
    const role = payload.role;
    if (!sub || !tenantId || !workspaceId || (role !== "ADMIN" && role !== "MEMBER")) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Invalid token claims",
        details: { reason: "missing_claims" as AuthTokenFailureReason }
      });
    }

    const scope = payload.scope;
    if (expectedScope && (scope === "client" || scope === "admin") && scope !== expectedScope) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Token scope mismatch",
        details: { reason: "scope_mismatch" as AuthTokenFailureReason }
      });
    }

    const impersonatorId =
      typeof payload.impersonatorId === "string" ? payload.impersonatorId : undefined;
    const family = typeof payload.family === "string" ? payload.family : undefined;

    return {
      sub,
      userId: typeof payload.userId === "string" ? payload.userId : sub,
      tenantId,
      workspaceId,
      role,
      impersonatorId,
      scope: scope === "client" || scope === "admin" ? scope : undefined,
      family
    };
  }

  toRequestUser(payload: VerifiedAccessPayload, workspaceId: string): RequestUser {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      workspaceId,
      role: payload.role,
      impersonatorId: payload.impersonatorId
    };
  }

  verifyPlatformAccessToken(token: string): VerifiedPlatformAccessPayload {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Auth not configured",
        details: { reason: "token_invalid" as AuthTokenFailureReason }
      });
    }

    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify(token, { secret }) as Record<string, unknown>;
    } catch (err: unknown) {
      const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
      let reason: AuthTokenFailureReason = "token_invalid";
      let message = "Invalid token";
      if (name === "TokenExpiredError") {
        reason = "token_expired";
        message = "Access token expired";
      }
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message,
        details: { reason }
      });
    }

    if (payload.typ !== "platform") {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Wrong token type",
        details: { reason: "token_wrong_type" as AuthTokenFailureReason }
      });
    }

    const sub = typeof payload.sub === "string" ? payload.sub : undefined;
    const platformRole = payload.platformRole;
    const scope = payload.scope;
    if (payload.tenantId !== undefined || payload.workspaceId !== undefined) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Invalid token claims",
        details: { reason: "missing_claims" as AuthTokenFailureReason }
      });
    }
    if (!sub || platformRole !== "SUPERADMIN" || scope !== "platform") {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Invalid token claims",
        details: { reason: "missing_claims" as AuthTokenFailureReason }
      });
    }

    const family = typeof payload.family === "string" ? payload.family : undefined;
    return {
      sub,
      platformUserId: sub,
      platformRole: "SUPERADMIN",
      scope: "platform",
      family
    };
  }

  toPlatformRequestUser(payload: VerifiedPlatformAccessPayload): PlatformRequestUser {
    return {
      platformUserId: payload.platformUserId,
      platformRole: payload.platformRole
    };
  }
}
