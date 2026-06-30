import { ErrorCodes } from "@kloqra/contracts";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

function accessTtlSeconds(): number {
  const raw = process.env.JWT_ACCESS_EXPIRES?.trim() ?? "15m";
  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) return 15 * 60;
  const value = Number(match[1]);
  switch (match[2]!.toLowerCase()) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86_400;
    default:
      return 15 * 60;
  }
}

@Injectable()
export class AuthRevocationService {
  constructor(private redis: RedisService) {}

  private familyKey(familyId: string): string {
    return `auth:revoked-family:${familyId}`;
  }

  private userKey(userId: string): string {
    return `auth:revoked-user:${userId}`;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.redis.getClient().setex(this.familyKey(familyId), accessTtlSeconds(), "1");
  }

  async revokeUser(userId: string): Promise<void> {
    await this.redis.getClient().setex(this.userKey(userId), accessTtlSeconds(), "1");
  }

  async assertNotRevoked(userId: string, familyId?: string): Promise<void> {
    const client = this.redis.getClient();
    const userRevoked = await client.get(this.userKey(userId));
    if (userRevoked) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Session revoked",
        details: { reason: "session_revoked" }
      });
    }
    if (familyId) {
      const familyRevoked = await client.get(this.familyKey(familyId));
      if (familyRevoked) {
        throw new UnauthorizedException({
          code: ErrorCodes.UNAUTHORIZED,
          message: "Session revoked",
          details: { reason: "session_revoked" }
        });
      }
    }
  }
}
