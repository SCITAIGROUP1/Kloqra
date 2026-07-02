import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ErrorCodes, parseUserPreferences } from "@kloqra/contracts";
import type {
  LoginDto,
  AuthSessionDto,
  LoginRequires2faResponseDto,
  LoginRequiresPasswordChangeResponseDto,
  LoginRequiresEmailVerificationResponseDto,
  LoginRequiresPlatform2faSetupResponseDto,
  SetInitialPasswordDto,
  OkResponseDto,
  PlatformSessionDto,
  Platform2faSetupEnableResponseDto,
  CompletePlatform2faSetupDto,
  SignupDto
} from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import {
  verify as verifyTotp,
  generateSecret,
  generateURI
} from "../../../common/auth/otplib.util";
import { hashPassword } from "../../../common/auth/password.util";
import { DomainException } from "../../../common/errors/domain.exception";
import {
  AuthMailer,
  buildAdminVerifyEmailUrl,
  buildPasswordResetUrl,
  buildPlatformPasswordResetUrl,
  buildVerifyEmailUrl
} from "../../../common/mailer/auth.mailer";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { assertTenantAllowsOperations } from "../../../common/tenant/assert-tenant-operations.util";
import { isSelfServeSignupEnabled } from "../../../common/tenant/self-serve-signup.util";
import {
  assertWorkspaceInUserTenant,
  resolveTenantRoleForUser
} from "../../../common/tenant/tenant-context";
import { TenantProvisioningService } from "../../../common/tenant/tenant-provisioning.service";
import {
  asUserWithMemberships,
  isWorkspaceMembershipActive
} from "../../../common/workspace/workspace-member.types";
import { splitDisplayName } from "../../users/application/user-name.util";

const IMPERSONATION_HANDOFF_EXPIRES = "90s";
const INVALID_LOGIN_MESSAGE = "Invalid email or password. Please try again.";

const loginMembershipsInclude = {
  where: { isActive: true },
  include: { workspace: true },
  orderBy: { createdAt: "asc" as const },
  take: 1
} as const;

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
    private authMailer: AuthMailer,
    private projectAccess: ProjectAccessService,
    private provisioning: TenantProvisioningService
  ) {}

  /** Tenant-aware Prisma delegate (workspace.tenantId lives on generated client). */
  private db() {
    return generatedPrisma(this.prisma);
  }

  async switchWorkspace(userId: string, workspaceId: string): Promise<AuthSessionDto> {
    const membership = await this.db().workspaceMember.findUnique({
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
    await assertWorkspaceInUserTenant(this.prisma, userId, membership.workspace.tenantId);
    return this.buildSessionFromMembership(membership);
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
        ? await this.db().user.findUnique({
            where: { id: userId },
            include: {
              memberships: loginMembershipsInclude
            }
          })
        : await this.db().user.findUnique({
            where: { email: dto.email },
            include: {
              memberships: loginMembershipsInclude
            }
          })
    );

    if (!user) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        INVALID_LOGIN_MESSAGE,
        HttpStatus.UNAUTHORIZED
      );
    }

    if (!dto.pendingToken) {
      if (!dto.email || !(await bcrypt.compare(dto.password, user.passwordHash))) {
        throw new DomainException(
          ErrorCodes.UNAUTHORIZED,
          INVALID_LOGIN_MESSAGE,
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
    return this.buildSessionFromMembership({
      workspaceId: membership.workspaceId,
      role: membership.role,
      workspace: membership.workspace,
      user
    });
  }

  async setInitialPassword(
    dto: SetInitialPasswordDto
  ): Promise<
    AuthSessionDto | LoginRequires2faResponseDto | LoginRequiresEmailVerificationResponseDto
  > {
    const userId = this.verifyPendingPasswordChangeToken(dto.pendingToken);
    const user = asUserWithMemberships(
      await this.db().user.findUnique({
        where: { id: userId },
        include: {
          memberships: loginMembershipsInclude
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

    return this.buildSessionFromMembership({
      workspaceId: membership.workspaceId,
      role: membership.role,
      workspace: membership.workspace,
      user
    });
  }

  async forgotPassword(email: string, scope?: string): Promise<OkResponseDto> {
    const normalized = email.trim().toLowerCase();
    if (scope === "platform") {
      const platformUser = await this.db().platformUser.findUnique({
        where: { email: normalized }
      });
      if (!platformUser) {
        return { ok: true };
      }

      const raw = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await this.db().platformUser.update({
        where: { id: platformUser.id },
        data: {
          passwordResetTokenHash: hashToken(raw),
          passwordResetExpiresAt: expiresAt
        }
      });

      void this.authMailer
        .sendPlatformPasswordReset({
          to: platformUser.email,
          resetUrl: buildPlatformPasswordResetUrl(raw)
        })
        .catch(() => undefined);

      return { ok: true };
    }

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

  async resetPassword(token: string, newPassword: string, scope?: string): Promise<OkResponseDto> {
    if (scope === "platform") {
      const platformUser = await this.db().platformUser.findFirst({
        where: {
          passwordResetTokenHash: hashToken(token),
          passwordResetExpiresAt: { gt: new Date() }
        }
      });
      if (!platformUser) {
        throw new DomainException(
          ErrorCodes.UNAUTHORIZED,
          "Password reset link is invalid or expired",
          HttpStatus.UNAUTHORIZED
        );
      }

      const passwordHash = await hashPassword(newPassword);
      await this.db().platformUser.update({
        where: { id: platformUser.id },
        data: {
          passwordHash,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null
        }
      });
      await this.revokeAllPlatformRefreshTokens(platformUser.id);
      return { ok: true };
    }

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

  async sendAdminEmailVerification(userId: string): Promise<void> {
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
      .sendEmailVerification({ to: user.email, verifyUrl: buildAdminVerifyEmailUrl(raw) })
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

  async signup(dto: SignupDto): Promise<OkResponseDto> {
    if (!isSelfServeSignupEnabled()) {
      throw new DomainException(
        ErrorCodes.SIGNUP_DISABLED,
        "Self-serve signup is not enabled",
        HttpStatus.FORBIDDEN
      );
    }

    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await this.db().tenantMember.findUnique({
        where: { userId: existingUser.id }
      });
      if (existingMember) {
        throw new DomainException(
          ErrorCodes.ALREADY_IN_ORGANIZATION,
          "This email already belongs to an organization",
          HttpStatus.CONFLICT
        );
      }
      throw new DomainException(
        ErrorCodes.EMAIL_ALREADY_REGISTERED,
        "An account with this email already exists",
        HttpStatus.CONFLICT
      );
    }

    const plan = await this.db().plan.findUnique({ where: { slug: dto.planSlug } });
    if (!plan?.isPublic) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        `Plan is not available for signup: ${dto.planSlug}`,
        HttpStatus.BAD_REQUEST
      );
    }

    const passwordHash = await hashPassword(dto.password);
    const result = await this.provisioning.provisionTenant({
      mode: "self_serve",
      organizationName: dto.organizationName.trim(),
      ownerEmail: email,
      ownerName: dto.name.trim(),
      planId: plan.id,
      passwordHash
    });

    await this.sendAdminEmailVerification(result.ownerUserId);
    return { ok: true };
  }

  async verifyEmail(
    token: string
  ): Promise<
    AuthSessionDto | LoginRequires2faResponseDto | LoginRequiresPasswordChangeResponseDto
  > {
    const user = asUserWithMemberships(
      await this.db().user.findFirst({
        where: {
          emailVerificationTokenHash: hashToken(token),
          emailVerificationExpiresAt: { gt: new Date() }
        },
        include: {
          memberships: loginMembershipsInclude
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

    return this.buildSessionFromMembership({
      workspaceId: membership.workspaceId,
      role: membership.role,
      workspace: membership.workspace,
      user: verifiedUser
    });
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
    tenantId: string,
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
        tenantId,
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

    // Revoke the consumed token LAST to avoid race conditions
    await this.prisma.refreshToken.update({
      where: { tokenHash: hash },
      data: { revokedAt: new Date(), lastUsedAt: new Date() }
    });

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
      ? await this.db().workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId } },
          include: { user: true, workspace: true }
        })
      : await this.db().workspaceMember.findFirst({
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

    return this.buildSessionFromMembership(membership, impersonatorId, impersonatorName);
  }

  async getMe(
    userId: string,
    workspaceId: string,
    impersonatorId?: string
  ): Promise<AuthSessionDto> {
    const dbUser = await this.db().user.findUniqueOrThrow({ where: { id: userId } });
    const workspace = await this.db().workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });

    let impersonatorName: string | undefined;
    if (impersonatorId) {
      const impUser = await this.prisma.user.findUnique({ where: { id: impersonatorId } });
      impersonatorName = impUser?.name;
    }

    const membership = await this.db().workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId } }
    });
    if (!isWorkspaceMembershipActive(membership)) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Workspace membership is deactivated",
        HttpStatus.FORBIDDEN
      );
    }

    return this.buildSessionFromMembership(
      { ...membership, user: dbUser, workspace },
      impersonatorId,
      impersonatorName
    );
  }

  private async buildSessionFromMembership(
    membership: {
      workspaceId: string;
      role: string;
      workspace: { name: string; tenantId: string };
      user: {
        id: string;
        email: string;
        name: string;
        firstName?: string | null;
        lastName?: string | null;
        defaultHourlyRate: { toNumber(): number } | null;
        preferences?: unknown;
      };
    },
    impersonatorId?: string,
    impersonatorName?: string
  ): Promise<AuthSessionDto> {
    const tenantId = await assertWorkspaceInUserTenant(
      this.prisma,
      membership.user.id,
      membership.workspace.tenantId
    );
    await assertTenantAllowsOperations(this.prisma, tenantId);
    const tenantRole = await resolveTenantRoleForUser(this.prisma, membership.user.id, tenantId);
    const managedProjectIds =
      membership.role === "MEMBER"
        ? await this.projectAccess.managedProjectIds(membership.workspaceId, membership.user.id)
        : undefined;
    return this.buildSession(
      membership.user,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name,
      tenantId,
      tenantRole,
      impersonatorId,
      impersonatorName,
      managedProjectIds
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
    tenantId: string,
    tenantRole?: "OWNER" | "ADMIN",
    impersonatorId?: string,
    impersonatorName?: string,
    managedProjectIds?: string[]
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
      tenantId,
      ...(tenantRole ? { tenantRole } : {}),
      workspaceId,
      workspaceName,
      workspaceRole: role,
      ...(preferences.defaultWorkspaceId
        ? { defaultWorkspaceId: preferences.defaultWorkspaceId }
        : {}),
      ...(managedProjectIds && managedProjectIds.length > 0 ? { managedProjectIds } : {}),
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
    const targetMembership = await this.db().workspaceMember.findUnique({
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

    const session = await this.buildSessionFromMembership(
      targetMembership,
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
      session.tenantId,
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

  async loginPlatform(
    dto: LoginDto
  ): Promise<
    PlatformSessionDto | LoginRequires2faResponseDto | LoginRequiresPlatform2faSetupResponseDto
  > {
    let platformUserId: string | undefined;

    if (dto.pendingToken) {
      platformUserId = this.verifyPlatformPending2faToken(dto.pendingToken);
    }

    const user = platformUserId
      ? await this.db().platformUser.findUnique({ where: { id: platformUserId } })
      : await this.db().platformUser.findUnique({ where: { email: dto.email } });

    if (!user || !user.isActive) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        INVALID_LOGIN_MESSAGE,
        HttpStatus.UNAUTHORIZED
      );
    }

    if (!dto.pendingToken) {
      if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
        throw new DomainException(
          ErrorCodes.UNAUTHORIZED,
          INVALID_LOGIN_MESSAGE,
          HttpStatus.UNAUTHORIZED
        );
      }
    }

    if (user.role !== "SUPERADMIN" && user.role !== "SUPPORT") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Platform access required",
        HttpStatus.FORBIDDEN
      );
    }

    if (!user.totpEnabledAt || !user.totpSecret) {
      return this.buildPlatformSession(user);
    }

    if (!dto.totpCode) {
      return {
        requires2fa: true,
        pendingToken: this.signPlatformPending2faToken(user.id)
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

    return this.buildPlatformSession(user);
  }

  async enablePlatform2faSetup(pendingToken: string): Promise<Platform2faSetupEnableResponseDto> {
    const platformUserId = this.verifyPlatformPending2faSetupToken(pendingToken);
    const user = await this.db().platformUser.findUniqueOrThrow({ where: { id: platformUserId } });
    if (user.totpEnabledAt) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Two-factor authentication is already enabled",
        HttpStatus.CONFLICT
      );
    }

    const secret = await generateSecret();
    const otpauthUrl = await generateURI({
      issuer: "Kloqra Platform",
      label: user.email,
      secret
    });

    await this.db().platformUser.update({
      where: { id: platformUserId },
      data: { totpSecret: secret, totpEnabledAt: null }
    });

    return { secret, otpauthUrl };
  }

  async completePlatform2faSetup(dto: CompletePlatform2faSetupDto): Promise<PlatformSessionDto> {
    const platformUserId = this.verifyPlatformPending2faSetupToken(dto.pendingToken);
    const user = await this.db().platformUser.findUniqueOrThrow({ where: { id: platformUserId } });
    if (!user.totpSecret) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Enable two-factor authentication first",
        HttpStatus.BAD_REQUEST
      );
    }

    const verification = await verifyTotp({ token: dto.code, secret: user.totpSecret });
    if (!verification.valid) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Invalid authentication code",
        HttpStatus.UNAUTHORIZED
      );
    }

    const updated = await this.db().platformUser.update({
      where: { id: platformUserId },
      data: { totpEnabledAt: new Date() }
    });

    return this.buildPlatformSession(updated);
  }

  private signPlatformPending2faToken(platformUserId: string): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not set on the API service");
    return this.jwt.sign(
      { sub: platformUserId, purpose: "platform-2fa-pending" },
      { secret, expiresIn: "5m" }
    );
  }

  private verifyPlatformPending2faToken(token: string): string {
    return this.verifyPendingToken(
      token,
      "platform-2fa-pending",
      "Two-factor session expired — sign in again"
    );
  }

  private signPlatformPending2faSetupToken(platformUserId: string): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not set on the API service");
    return this.jwt.sign(
      { sub: platformUserId, purpose: "platform-2fa-setup-pending" },
      { secret, expiresIn: "15m" }
    );
  }

  private verifyPlatformPending2faSetupToken(token: string): string {
    return this.verifyPendingToken(
      token,
      "platform-2fa-setup-pending",
      "Two-factor setup session expired — sign in again"
    );
  }

  private async revokeAllPlatformRefreshTokens(platformUserId: string): Promise<void> {
    const now = new Date();
    await this.db().platformRefreshToken.updateMany({
      where: { platformUserId, revokedAt: null },
      data: { revokedAt: now }
    });
  }

  buildPlatformSession(user: {
    id: string;
    email: string;
    name: string;
    role: string;
  }): PlatformSessionDto {
    const platformRole = user.role === "SUPERADMIN" ? "SUPERADMIN" : "SUPERADMIN";
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        platformRole
      },
      platformRole
    };
  }

  signPlatformAccessToken(platformUserId: string, family?: string): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not set on the API service");
    }
    return this.jwt.sign(
      {
        sub: platformUserId,
        platformRole: "SUPERADMIN",
        typ: "platform",
        scope: "platform",
        ...(family ? { family } : {})
      },
      { secret, expiresIn: process.env.JWT_ACCESS_EXPIRES ?? "15m" }
    );
  }

  async signAndStorePlatformRefreshToken(
    platformUserId: string,
    family?: string,
    sessionMeta?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ raw: string; family: string }> {
    const secret = process.env.JWT_REFRESH_SECRET?.trim();
    if (!secret) throw new Error("JWT_REFRESH_SECRET is not set on the API service");

    const db = this.db();
    const tokenFamily = family ?? randomUUID();
    const raw = this.jwt.sign(
      {
        sub: platformUserId,
        family: tokenFamily,
        jti: randomUUID(),
        typ: "platform_refresh",
        scope: "platform"
      },
      { secret, expiresIn: process.env.JWT_REFRESH_EXPIRES ?? "7d" }
    );

    const expiresInMs = parseDuration(process.env.JWT_REFRESH_EXPIRES ?? "7d");
    const expiresAt = new Date(Date.now() + expiresInMs);
    const now = new Date();

    await db.platformRefreshToken.create({
      data: {
        platformUserId,
        tokenHash: hashToken(raw),
        family: tokenFamily,
        expiresAt,
        userAgent: sessionMeta?.userAgent ?? null,
        ipAddress: sessionMeta?.ipAddress ?? null,
        lastUsedAt: now
      }
    });

    await db.platformRefreshToken
      .deleteMany({ where: { platformUserId, expiresAt: { lt: new Date() } } })
      .catch(() => undefined);

    return { raw, family: tokenFamily };
  }

  verifyPlatformRefresh(token: string): { platformUserId: string; family?: string } {
    const payload = this.jwt.verify(token, { secret: process.env.JWT_REFRESH_SECRET }) as {
      sub: string;
      family?: string;
      typ?: string;
      scope?: string;
    };
    if (payload.typ !== "platform_refresh" || payload.scope !== "platform") {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Wrong token type",
        HttpStatus.UNAUTHORIZED
      );
    }
    return { platformUserId: payload.sub, family: payload.family };
  }

  async rotatePlatformRefreshToken(
    rawToken: string,
    requestMeta?: { userAgent?: string }
  ): Promise<{
    session: PlatformSessionDto | null;
    newRefreshToken: string | null;
    family?: string;
  }> {
    const { platformUserId, family } = this.verifyPlatformRefresh(rawToken);
    const hash = hashToken(rawToken);
    const db = this.db();

    const stored = await db.platformRefreshToken.findUnique({ where: { tokenHash: hash } });
    if (!stored) {
      const session = await this.refreshPlatformSession(platformUserId);
      return { session, newRefreshToken: null };
    }

    if (stored.revokedAt !== null) {
      const graceMs = Number(process.env.REFRESH_ROTATION_GRACE_MS ?? 10_000);
      const withinGrace = Date.now() - stored.revokedAt.getTime() <= graceMs;
      if (withinGrace && family) {
        const active = await db.platformRefreshToken.findFirst({
          where: {
            platformUserId: stored.platformUserId,
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
          const session = await this.refreshPlatformSession(stored.platformUserId);
          return { session, newRefreshToken: null, family: family ?? stored.family };
        }
      }

      if (family) {
        await db.platformRefreshToken.updateMany({
          where: { platformUserId: stored.platformUserId, family },
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

    const session = await this.refreshPlatformSession(stored.platformUserId);
    if (!session) return { session: null, newRefreshToken: null };

    const newToken = await this.signAndStorePlatformRefreshToken(stored.platformUserId, family, {
      userAgent: requestMeta?.userAgent ?? stored.userAgent ?? undefined,
      ipAddress: stored.ipAddress ?? undefined
    });

    await db.platformRefreshToken.update({
      where: { tokenHash: hash },
      data: { revokedAt: new Date(), lastUsedAt: new Date() }
    });

    return { session, newRefreshToken: newToken.raw, family: family ?? stored.family };
  }

  async refreshPlatformSession(platformUserId: string): Promise<PlatformSessionDto | null> {
    const db = this.db();
    const user = await db.platformUser.findUnique({ where: { id: platformUserId } });
    if (!user || !user.isActive || user.role !== "SUPERADMIN") return null;
    return this.buildPlatformSession(user);
  }

  async getPlatformMe(platformUserId: string): Promise<PlatformSessionDto> {
    const db = this.db();
    const user = await db.platformUser.findUniqueOrThrow({ where: { id: platformUserId } });
    if (!user.isActive || user.role !== "SUPERADMIN") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Platform access required",
        HttpStatus.FORBIDDEN
      );
    }
    return this.buildPlatformSession(user);
  }

  async revokePlatformRefreshToken(rawToken: string): Promise<void> {
    try {
      const hash = hashToken(rawToken);
      const db = this.db();
      await db.platformRefreshToken.update({
        where: { tokenHash: hash },
        data: { revokedAt: new Date() }
      });
    } catch {
      // Ignore if not found
    }
  }
}
