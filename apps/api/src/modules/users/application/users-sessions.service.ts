import { createHash } from "node:crypto";
import type { UserSessionDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { AuthRevocationService } from "../../../common/auth/auth-revocation.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

@Injectable()
export class UsersSessionsService {
  constructor(
    private prisma: PrismaService,
    private authRevocation: AuthRevocationService
  ) {}

  async listSessions(userId: string, currentRefreshToken?: string): Promise<UserSessionDto[]> {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastUsedAt: "desc" }
    });

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: (session.lastUsedAt ?? session.createdAt).toISOString(),
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isCurrent: currentHash !== null && session.tokenHash === currentHash
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<{ ok: true }> {
    const session = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, userId }
    });
    if (!session) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Session not found", HttpStatus.NOT_FOUND);
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId, family: session.family, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await this.authRevocation.revokeFamily(session.family);

    return { ok: true };
  }

  async revokeOtherSessions(
    userId: string,
    currentRefreshToken?: string
  ): Promise<{ revoked: number }> {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    const currentSession = currentHash
      ? await this.prisma.refreshToken.findFirst({
          where: { userId, tokenHash: currentHash, revokedAt: null }
        })
      : null;

    const otherSessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(currentSession?.family ? { family: { not: currentSession.family } } : {})
      },
      select: { family: true },
      distinct: ["family"]
    });

    if (otherSessions.length === 0) {
      return { revoked: 0 };
    }

    const families = otherSessions.map((session) => session.family);
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        family: { in: families }
      },
      data: { revokedAt: new Date() }
    });

    await Promise.all(families.map((family) => this.authRevocation.revokeFamily(family)));

    return { revoked: result.count };
  }
}
