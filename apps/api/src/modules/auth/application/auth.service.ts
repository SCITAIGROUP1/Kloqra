import { createHash, randomUUID } from "node:crypto";
import { ErrorCodes } from "@chronomint/contracts";
import type { LoginDto, RegisterDto, AuthSessionDto } from "@chronomint/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new DomainException(
        ErrorCodes.EMAIL_EXISTS,
        "Email already registered",
        HttpStatus.CONFLICT
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const wsName = dto.workspaceName ?? `${dto.name}'s Workspace`;
    let slug = slugify(wsName);
    const slugTaken = await this.prisma.workspace.findUnique({ where: { slug } });
    if (slugTaken) slug = `${slug}-${Date.now()}`;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        memberships: {
          create: {
            role: "ADMIN",
            workspace: { create: { name: wsName, slug } }
          }
        }
      },
      include: { memberships: { include: { workspace: true } } }
    });

    const membership = user.memberships[0]!;
    return this.buildSession(
      user,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name
    );
  }

  async switchWorkspace(userId: string, workspaceId: string): Promise<AuthSessionDto> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { user: true, workspace: true }
    });
    if (!membership) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Not a member of this workspace",
        HttpStatus.FORBIDDEN
      );
    }
    return this.buildSession(
      membership.user,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name
    );
  }

  async login(dto: LoginDto): Promise<AuthSessionDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: { include: { workspace: true }, take: 1 } }
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Invalid credentials",
        HttpStatus.UNAUTHORIZED
      );
    }
    const membership = user.memberships[0];
    if (!membership) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "No workspace membership",
        HttpStatus.NOT_FOUND
      );
    }
    return this.buildSession(
      user,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name
    );
  }

  signAccessToken(
    userId: string,
    workspaceId: string,
    role: "ADMIN" | "MEMBER",
    impersonatorId?: string
  ): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not set on the API service");
    }
    return this.jwt.sign(
      { sub: userId, userId, workspaceId, role, ...(impersonatorId ? { impersonatorId } : {}) },
      { secret, expiresIn: process.env.JWT_ACCESS_EXPIRES ?? "15m" }
    );
  }

  /**
   * Signs a refresh token and stores its hash in the DB for revocation tracking.
   * Returns the raw JWT (stored in cookie) + the DB record ID for the family.
   */
  async signAndStoreRefreshToken(
    userId: string,
    workspaceId: string,
    family?: string,
    impersonatorId?: string
  ): Promise<string> {
    const secret = process.env.JWT_REFRESH_SECRET?.trim();
    if (!secret) throw new Error("JWT_REFRESH_SECRET is not set on the API service");

    const tokenFamily = family ?? randomUUID();
    const raw = this.jwt.sign(
      {
        sub: userId,
        workspaceId,
        family: tokenFamily,
        ...(impersonatorId ? { impersonatorId } : {})
      },
      { secret, expiresIn: process.env.JWT_REFRESH_EXPIRES ?? "7d" }
    );

    const expiresInMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiresInMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        workspaceId,
        tokenHash: hashToken(raw),
        family: tokenFamily,
        expiresAt
      }
    });

    // Clean up expired tokens for this user (housekeeping)
    await this.prisma.refreshToken
      .deleteMany({ where: { userId, expiresAt: { lt: new Date() } } })
      .catch(() => undefined);

    return raw;
  }

  /** Legacy signing for code paths that don't yet use DB rotation */
  signRefreshToken(userId: string, workspaceId: string): string {
    const secret = process.env.JWT_REFRESH_SECRET?.trim();
    if (!secret) throw new Error("JWT_REFRESH_SECRET is not set on the API service");
    return this.jwt.sign(
      { sub: userId, workspaceId },
      { secret, expiresIn: process.env.JWT_REFRESH_EXPIRES ?? "7d" }
    );
  }

  verifyRefresh(token: string): {
    userId: string;
    workspaceId?: string;
    family?: string;
    impersonatorId?: string;
  } {
    const payload = this.jwt.verify(token, { secret: process.env.JWT_REFRESH_SECRET }) as {
      sub: string;
      workspaceId?: string;
      family?: string;
      impersonatorId?: string;
    };
    return {
      userId: payload.sub,
      workspaceId: payload.workspaceId,
      family: payload.family,
      impersonatorId: payload.impersonatorId
    };
  }

  /**
   * DB-backed refresh with rotation.
   * - Validates the token hash exists in DB and is not revoked.
   * - On replay (hash exists but already revoked): revokes entire family → forces re-login.
   * - On success: revokes old token, issues new token in same family.
   */
  async rotateRefreshToken(
    rawToken: string
  ): Promise<{ session: AuthSessionDto | null; newRefreshToken: string | null }> {
    const { userId, workspaceId, family, impersonatorId } = this.verifyRefresh(rawToken);
    const hash = hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });

    if (!stored) {
      // Unknown token — possibly DB was cleared or token from before this feature
      // Fall back gracefully
      const session = await this.refreshSession(userId, workspaceId, impersonatorId);
      return { session, newRefreshToken: null };
    }

    if (stored.revokedAt !== null) {
      // Token reuse detected! Revoke entire family (prevents replay attacks)
      if (family) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, family },
          data: { revokedAt: new Date() }
        });
      }
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Refresh token reuse detected — please log in again",
        HttpStatus.UNAUTHORIZED
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Refresh token expired",
        HttpStatus.UNAUTHORIZED
      );
    }

    // Revoke the consumed token
    await this.prisma.refreshToken.update({
      where: { tokenHash: hash },
      data: { revokedAt: new Date() }
    });

    // Build session
    const session = await this.refreshSession(stored.userId, stored.workspaceId, impersonatorId);
    if (!session) return { session: null, newRefreshToken: null };

    // Issue rotated token in same family
    const newToken = await this.signAndStoreRefreshToken(
      stored.userId,
      stored.workspaceId,
      family,
      impersonatorId
    );

    return { session, newRefreshToken: newToken };
  }

  /** Revoke all refresh tokens for a user (logout all devices) */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  /** Revoke a single refresh token by its raw value */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    try {
      const hash = hashToken(rawToken);
      await this.prisma.refreshToken.update({
        where: { tokenHash: hash },
        data: { revokedAt: new Date() }
      });
    } catch {
      // Ignore if not found or already revoked
    }
  }

  async refreshSession(
    userId: string,
    workspaceId?: string,
    impersonatorId?: string
  ): Promise<AuthSessionDto | null> {
    const membership = workspaceId
      ? await this.prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId } },
          include: { user: true, workspace: true }
        })
      : await this.prisma.workspaceMember.findFirst({
          where: { userId },
          include: { user: true, workspace: true }
        });
    if (!membership) return null;

    let impersonatorName: string | undefined;
    if (impersonatorId) {
      const impUser = await this.prisma.user.findUnique({ where: { id: impersonatorId } });
      impersonatorName = impUser?.name;
    }

    return this.buildSession(
      membership.user,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name,
      impersonatorId,
      impersonatorName
    );
  }

  async getMe(
    userId: string,
    workspaceId: string,
    impersonatorId?: string
  ): Promise<AuthSessionDto> {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });

    let impersonatorName: string | undefined;
    if (impersonatorId) {
      const impUser = await this.prisma.user.findUnique({ where: { id: impersonatorId } });
      impersonatorName = impUser?.name;
    }

    return this.buildSession(
      dbUser,
      workspaceId,
      (
        await this.prisma.workspaceMember.findUniqueOrThrow({
          where: { workspaceId_userId: { workspaceId, userId } }
        })
      ).role as "ADMIN" | "MEMBER",
      workspace.name,
      impersonatorId,
      impersonatorName
    );
  }

  buildSession(
    user: {
      id: string;
      email: string;
      name: string;
      defaultHourlyRate: { toNumber(): number } | null;
    },
    workspaceId: string,
    role: "ADMIN" | "MEMBER",
    workspaceName: string,
    impersonatorId?: string,
    impersonatorName?: string
  ): AuthSessionDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultHourlyRate: user.defaultHourlyRate?.toNumber() ?? null
      },
      workspaceId,
      workspaceName,
      workspaceRole: role,
      impersonatorId,
      impersonatorName
    };
  }

  async impersonate(
    adminUserId: string,
    workspaceId: string,
    targetUserId: string
  ): Promise<{ session: AuthSessionDto; accessToken: string; refreshToken: string }> {
    const adminUser = await this.prisma.user.findUniqueOrThrow({ where: { id: adminUserId } });
    const targetMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      include: { user: true, workspace: true }
    });
    if (!targetMembership) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Target user is not a member of this workspace",
        HttpStatus.NOT_FOUND
      );
    }

    const session = this.buildSession(
      targetMembership.user,
      targetMembership.workspaceId,
      targetMembership.role as "ADMIN" | "MEMBER",
      targetMembership.workspace.name,
      adminUser.id,
      adminUser.name
    );

    const accessToken = this.signAccessToken(
      targetMembership.userId,
      targetMembership.workspaceId,
      targetMembership.role as "ADMIN" | "MEMBER",
      adminUser.id
    );

    const refreshToken = await this.signAndStoreRefreshToken(
      targetMembership.userId,
      targetMembership.workspaceId,
      undefined,
      adminUser.id
    );

    return { session, accessToken, refreshToken };
  }
}
