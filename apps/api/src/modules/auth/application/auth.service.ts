import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ErrorCodes, parseUserPreferences } from "@kloqra/contracts";
import type {
  LoginDto,
  AuthSessionDto,
  LoginRequires2faResponseDto,
  LoginRequiresPasswordChangeResponseDto,
  LoginRequiresEmailVerificationResponseDto,
  SetInitialPasswordDto,
  OkResponseDto
} from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { verify as verifyTotp } from "otplib";
import { hashPassword } from "../../../common/auth/password.util";
import { DomainException } from "../../../common/errors/domain.exception";
import {
  AuthMailer,
  buildPasswordResetUrl,
  buildVerifyEmailUrl
} from "../../../common/mailer/auth.mailer";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  activeMembershipsInclude,
  asUserWithMemberships,
  isWorkspaceMembershipActive
} from "../../../common/workspace/workspace-member.types";
import { splitDisplayName } from "../../users/application/user-name.util";

const IMPERSONATION_HANDOFF_EXPIRES = "90s";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private authMailer: AuthMailer
  ) {}

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
    if (!isWorkspaceMembershipActive(membership)) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Workspace membership is deactivated",
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

  async login(
    dto: LoginDto
  ): Promise<
    | AuthSessionDto
    | LoginRequires2faResponseDto
    | LoginRequiresPasswordChangeResponseDto
    | LoginRequiresEmailVerificationResponseDto
  > {
    let userId: string | undefined;

    if (dto.pendingToken) {
      userId = this.verifyPending2faToken(dto.pendingToken);
    }

    const user = asUserWithMemberships(
      userId
        ? await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
              memberships: activeMembershipsInclude()
            }
          })
        : await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: {
              memberships: activeMembershipsInclude()
            }
          })
    );

    if (!user) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Invalid credentials",
        HttpStatus.UNAUTHORIZED
      );
    }

    if (!dto.pendingToken) {
      if (!dto.email || !(await bcrypt.compare(dto.password, user.passwordHash))) {
        throw new DomainException(
          ErrorCodes.UNAUTHORIZED,
          "Invalid credentials",
          HttpStatus.UNAUTHORIZED
        );
      }

      if (user.mustChangePassword) {
        return {
          requiresPasswordChange: true,
          pendingToken: this.signPendingPasswordChangeToken(user.id)
        };
      }
    }

    if (!user.emailVerifiedAt) {
      return { requiresEmailVerification: true, email: user.email };
    }

    if (user.totpEnabledAt && user.totpSecret) {
      if (!dto.totpCode) {
        return {
          requires2fa: true,
          pendingToken: this.signPending2faToken(user.id)
        };
      }
      const verification = await verifyTotp({ token: dto.totpCode, secret: user.totpSecret });
      if (!verification.valid) {
        throw new DomainException(
          ErrorCodes.UNAUTHORIZED,
          "Invalid authentication code",
          HttpStatus.UNAUTHORIZED
        );
      }
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

  async setInitialPassword(
    dto: SetInitialPasswordDto
  ): Promise<
    AuthSessionDto | LoginRequires2faResponseDto | LoginRequiresEmailVerificationResponseDto
  > {
    const userId = this.verifyPendingPasswordChangeToken(dto.pendingToken);
    const user = asUserWithMemberships(
      await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberships: activeMembershipsInclude()
        }
      })
    );

    if (!user?.mustChangePassword) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Password change session expired — sign in again",
        HttpStatus.UNAUTHORIZED
      );
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false }
    });
    await this.revokeAllRefreshTokens(userId);

    const membership = user.memberships[0];
    if (!membership) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "No workspace membership",
        HttpStatus.NOT_FOUND
      );
    }

    if (!user.emailVerifiedAt) {
      return { requiresEmailVerification: true, email: user.email };
    }

    if (user.totpEnabledAt && user.totpSecret) {
      return {
        requires2fa: true,
        pendingToken: this.signPending2faToken(userId)
      };
    }

    return this.buildSession(
      user,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name
    );
  }

  async forgotPassword(email: string): Promise<OkResponseDto> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return { ok: true };
    }

    const raw = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashToken(raw),
        passwordResetExpiresAt: expiresAt
      }
    });

    void this.authMailer
      .sendPasswordReset({ to: user.email, resetUrl: buildPasswordResetUrl(raw) })
      .catch(() => undefined);

    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<OkResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: { gt: new Date() }
      }
    });
    if (!user) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Password reset link is invalid or expired",
        HttpStatus.UNAUTHORIZED
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null
      }
    });
    await this.revokeAllRefreshTokens(user.id);
    return { ok: true };
  }

  async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.emailVerifiedAt) return;

    const raw = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationTokenHash: hashToken(raw),
        emailVerificationExpiresAt: expiresAt
      }
    });

    void this.authMailer
      .sendEmailVerification({ to: user.email, verifyUrl: buildVerifyEmailUrl(raw) })
      .catch(() => undefined);
  }

  async resendVerification(email: string): Promise<OkResponseDto> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user || user.emailVerifiedAt) {
      return { ok: true };
    }
    await this.sendEmailVerification(user.id);
    return { ok: true };
  }

  async verifyEmail(
    token: string
  ): Promise<
    AuthSessionDto | LoginRequires2faResponseDto | LoginRequiresPasswordChangeResponseDto
  > {
    const user = asUserWithMemberships(
      await this.prisma.user.findFirst({
        where: {
          emailVerificationTokenHash: hashToken(token),
          emailVerificationExpiresAt: { gt: new Date() }
        },
        include: {
          memberships: activeMembershipsInclude()
        }
      })
    );

    if (!user) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Verification link is invalid or expired",
        HttpStatus.UNAUTHORIZED
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null
      }
    });

    const verifiedUser = { ...user, emailVerifiedAt: new Date() };

    if (verifiedUser.mustChangePassword) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Set your password before verifying email",
        HttpStatus.FORBIDDEN
      );
    }

    const membership = verifiedUser.memberships[0];
    if (!membership) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "No workspace membership",
        HttpStatus.NOT_FOUND
      );
    }

    if (verifiedUser.totpEnabledAt && verifiedUser.totpSecret) {
      return {
        requires2fa: true,
        pendingToken: this.signPending2faToken(verifiedUser.id)
      };
    }

    return this.buildSession(
      verifiedUser,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name
    );
  }

  private signPending2faToken(userId: string): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not set on the API service");
    return this.jwt.sign({ sub: userId, purpose: "2fa-pending" }, { secret, expiresIn: "5m" });
  }

  private verifyPending2faToken(token: string): string {
    return this.verifyPendingToken(
      token,
      "2fa-pending",
      "Two-factor session expired — sign in again"
    );
  }

  private signPendingPasswordChangeToken(userId: string): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not set on the API service");
    return this.jwt.sign(
      { sub: userId, purpose: "password-change-pending" },
      { secret, expiresIn: "5m" }
    );
  }

  private verifyPendingPasswordChangeToken(token: string): string {
    return this.verifyPendingToken(
      token,
      "password-change-pending",
      "Password change session expired — sign in again"
    );
  }

  private verifyPendingToken(token: string, purpose: string, expiredMessage: string): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not set on the API service");
    try {
      const payload = this.jwt.verify(token, { secret }) as { sub: string; purpose?: string };
      if (payload.purpose !== purpose) {
        throw new Error("invalid purpose");
      }
      return payload.sub;
    } catch {
      throw new DomainException(ErrorCodes.UNAUTHORIZED, expiredMessage, HttpStatus.UNAUTHORIZED);
    }
  }

  signAccessToken(
    userId: string,
    workspaceId: string,
    role: "ADMIN" | "MEMBER",
    impersonatorId?: string,
    scope?: "client" | "admin",
    family?: string
  ): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not set on the API service");
    }
    return this.jwt.sign(
      {
        sub: userId,
        userId,
        workspaceId,
        role,
        typ: "access",
        ...(family ? { family } : {}),
        ...(scope ? { scope } : {}),
        ...(impersonatorId ? { impersonatorId } : {})
      },
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
    impersonatorId?: string,
    sessionMeta?: { userAgent?: string; ipAddress?: string },
    scope?: "client" | "admin"
  ): Promise<{ raw: string; family: string }> {
    const secret = process.env.JWT_REFRESH_SECRET?.trim();
    if (!secret) throw new Error("JWT_REFRESH_SECRET is not set on the API service");

    const tokenFamily = family ?? randomUUID();
    const raw = this.jwt.sign(
      {
        sub: userId,
        workspaceId,
        family: tokenFamily,
        jti: randomUUID(),
        typ: "refresh",
        ...(scope ? { scope } : {}),
        ...(impersonatorId ? { impersonatorId } : {})
      },
      { secret, expiresIn: process.env.JWT_REFRESH_EXPIRES ?? "7d" }
    );

    const expiresInMs = parseDuration(process.env.JWT_REFRESH_EXPIRES ?? "7d");
    const expiresAt = new Date(Date.now() + expiresInMs);

    const now = new Date();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        workspaceId,
        tokenHash: hashToken(raw),
        family: tokenFamily,
        expiresAt,
        userAgent: sessionMeta?.userAgent ?? null,
        ipAddress: sessionMeta?.ipAddress ?? null,
        lastUsedAt: now
      }
    });

    // Clean up expired tokens for this user (housekeeping)
    await this.prisma.refreshToken
      .deleteMany({ where: { userId, expiresAt: { lt: new Date() } } })
      .catch(() => undefined);

    return { raw, family: tokenFamily };
  }

  /**
   * @deprecated Legacy signing for code paths that don't yet use DB rotation.
   * REMOVE: All callers migrated to signAndStoreRefreshToken.
   */
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
    scope?: "client" | "admin";
  } {
    const payload = this.jwt.verify(token, { secret: process.env.JWT_REFRESH_SECRET }) as {
      sub: string;
      workspaceId?: string;
      family?: string;
      impersonatorId?: string;
      typ?: string;
      scope?: string;
    };
    if (payload.typ === "access") {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Wrong token type",
        HttpStatus.UNAUTHORIZED
      );
    }
    return {
      userId: payload.sub,
      workspaceId: payload.workspaceId,
      family: payload.family,
      impersonatorId: payload.impersonatorId,
      scope: payload.scope === "client" || payload.scope === "admin" ? payload.scope : undefined
    };
  }

  /**
   * DB-backed refresh with rotation.
   * - Validates the token hash exists in DB and is not revoked.
   * - On replay (hash exists but already revoked): revokes entire family → forces re-login.
   * - On success: revokes old token, issues new token in same family.
   */
  async rotateRefreshToken(
    rawToken: string,
    requestMeta?: { userAgent?: string }
  ): Promise<{ session: AuthSessionDto | null; newRefreshToken: string | null; family?: string }> {
    const { userId, workspaceId, family, impersonatorId, scope } = this.verifyRefresh(rawToken);
    const hash = hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });

    if (!stored) {
      // Unknown token — possibly DB was cleared or token from before this feature
      // Fall back gracefully
      const session = await this.refreshSession(userId, workspaceId, impersonatorId);
      return { session, newRefreshToken: null };
    }

    if (stored.revokedAt !== null) {
      const graceMs = Number(process.env.REFRESH_ROTATION_GRACE_MS ?? 10_000);
      const revokedMs = stored.revokedAt.getTime();
      const withinGrace = Date.now() - revokedMs <= graceMs;

      if (withinGrace && family) {
        const active = await this.prisma.refreshToken.findFirst({
          where: {
            userId: stored.userId,
            family,
            revokedAt: null,
            expiresAt: { gt: new Date() }
          },
          orderBy: { createdAt: "desc" }
        });
        const uaMatch =
          !requestMeta?.userAgent ||
          !active?.userAgent ||
          active.userAgent === requestMeta.userAgent;
        if (active && uaMatch) {
          const session = await this.refreshSession(
            stored.userId,
            stored.workspaceId,
            impersonatorId
          );
          return { session, newRefreshToken: null, family: family ?? stored.family };
        }
      }

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
      data: { revokedAt: new Date(), lastUsedAt: new Date() }
    });

    // Build session
    const session = await this.refreshSession(stored.userId, stored.workspaceId, impersonatorId);
    if (!session) return { session: null, newRefreshToken: null };

    // Issue rotated token in same family
    const newToken = await this.signAndStoreRefreshToken(
      stored.userId,
      stored.workspaceId,
      family,
      impersonatorId,
      {
        userAgent: requestMeta?.userAgent ?? stored.userAgent ?? undefined,
        ipAddress: stored.ipAddress ?? undefined
      },
      scope
    );

    return { session, newRefreshToken: newToken.raw, family: family ?? stored.family };
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
          include: { user: true, workspace: true },
          orderBy: { createdAt: "asc" }
        });
    if (!membership) return null;
    if (!isWorkspaceMembershipActive(membership)) return null;

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

    const membership = await this.prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId } }
    });
    if (!isWorkspaceMembershipActive(membership)) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Workspace membership is deactivated",
        HttpStatus.FORBIDDEN
      );
    }

    return this.buildSession(
      dbUser,
      workspaceId,
      membership.role as "ADMIN" | "MEMBER",
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
      firstName?: string | null;
      lastName?: string | null;
      defaultHourlyRate: { toNumber(): number } | null;
      preferences?: unknown;
    },
    workspaceId: string,
    role: "ADMIN" | "MEMBER",
    workspaceName: string,
    impersonatorId?: string,
    impersonatorName?: string
  ): AuthSessionDto {
    const names = user.firstName
      ? { firstName: user.firstName, lastName: user.lastName ?? "" }
      : splitDisplayName(user.name);
    const preferences = parseUserPreferences(user.preferences);
    const sessionUser: AuthSessionDto["user"] = {
      id: user.id,
      name: user.name,
      firstName: names.firstName,
      lastName: names.lastName
    };
    if (role === "ADMIN") {
      sessionUser.defaultHourlyRate = user.defaultHourlyRate?.toNumber() ?? null;
    }
    return {
      user: sessionUser,
      workspaceId,
      workspaceName,
      workspaceRole: role,
      ...(preferences.defaultWorkspaceId
        ? { defaultWorkspaceId: preferences.defaultWorkspaceId }
        : {}),
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

    if (targetMembership.role === "ADMIN") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Admins cannot impersonate other admins",
        HttpStatus.FORBIDDEN
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

    const issued = await this.signAndStoreRefreshToken(
      targetMembership.userId,
      targetMembership.workspaceId,
      undefined,
      adminUser.id,
      undefined,
      "client"
    );

    const accessToken = this.signAccessToken(
      targetMembership.userId,
      targetMembership.workspaceId,
      targetMembership.role as "ADMIN" | "MEMBER",
      adminUser.id,
      "client",
      issued.family
    );

    return { session, accessToken, refreshToken: issued.raw };
  }

  private signImpersonationHandoffToken(
    adminUserId: string,
    workspaceId: string,
    targetUserId: string
  ): string {
    const secret = process.env.JWT_REFRESH_SECRET?.trim();
    if (!secret) throw new Error("JWT_REFRESH_SECRET is not set on the API service");
    return this.jwt.sign(
      {
        typ: "impersonation_handoff",
        sub: targetUserId,
        workspaceId,
        impersonatorId: adminUserId
      },
      { secret, expiresIn: IMPERSONATION_HANDOFF_EXPIRES }
    );
  }

  async createImpersonationHandoff(
    adminUserId: string,
    workspaceId: string,
    targetUserId: string
  ): Promise<{
    session: AuthSessionDto;
    handoffToken: string;
    accessToken: string;
    refreshToken: string;
  }> {
    const { session, accessToken, refreshToken } = await this.impersonate(
      adminUserId,
      workspaceId,
      targetUserId
    );
    const handoffToken = this.signImpersonationHandoffToken(adminUserId, workspaceId, targetUserId);
    return { session, handoffToken, accessToken, refreshToken };
  }

  async consumeImpersonationHandoff(handoffToken: string): Promise<{
    session: AuthSessionDto;
    accessToken: string;
    refreshToken: string;
  } | null> {
    const secret = process.env.JWT_REFRESH_SECRET?.trim();
    if (!secret) return null;
    try {
      const payload = this.jwt.verify(handoffToken, { secret }) as {
        typ?: string;
        sub?: string;
        workspaceId?: string;
        impersonatorId?: string;
      };
      if (
        payload.typ !== "impersonation_handoff" ||
        !payload.sub ||
        !payload.workspaceId ||
        !payload.impersonatorId
      ) {
        return null;
      }
      return this.impersonate(payload.impersonatorId, payload.workspaceId, payload.sub);
    } catch {
      return null;
    }
  }

  async verifyImpersonator(
    impersonatorId: string,
    workspaceId: string
  ): Promise<{ id: string; name: string }> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: impersonatorId } },
      include: { user: true }
    });
    if (!membership || membership.role !== "ADMIN") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Impersonator is not an administrator of the target workspace",
        HttpStatus.FORBIDDEN
      );
    }
    return { id: membership.userId, name: membership.user.name };
  }
}
