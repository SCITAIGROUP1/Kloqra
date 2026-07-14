import type {
  InviteTenantMemberDto,
  InviteTenantMemberResponseDto,
  PublicTenantDto,
  TenantDto,
  TenantMemberDto,
  TenantOverviewDto,
  UpdateTenantCurrentDto,
  UpdateTenantMemberDto
} from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { generateTempPassword, hashPassword } from "../../../common/auth/password.util";
import { DomainException } from "../../../common/errors/domain.exception";
import { deliverMemberEmail } from "../../../common/mailer/member-email-delivery.util";
import { TenantOwnerProvisioningMailer } from "../../../common/mailer/tenant-owner-provisioning.mailer";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  assertUserNotInOtherTenant,
  requireTenantMember,
  requireTenantOwnerInTenant,
  requireTenantOwnerOrAdmin
} from "../../../common/tenant/tenant-context";
// eslint-disable-next-line no-restricted-imports
import { AuthService } from "../../auth/application/auth.service";
import { PlanLimitService } from "../../subscriptions/application/plan-limit.service";
import { SubscriptionsService } from "../../subscriptions/application/subscriptions.service";
import { splitDisplayName } from "../../users/application/user-name.util";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: unknown;
  createdAt: Date;
};

type TenantMemberRow = {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  isActive: boolean;
  user: { name: string; email: string };
};

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private tenantMailer: TenantOwnerProvisioningMailer,
    private auth: AuthService,
    private subscriptions: SubscriptionsService,
    private planLimit: PlanLimitService
  ) {}

  private toTenantDto(tenant: TenantRow): TenantDto {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status as TenantDto["status"],
      settings:
        tenant.settings && typeof tenant.settings === "object"
          ? (tenant.settings as Record<string, unknown>)
          : undefined,
      createdAt: tenant.createdAt.toISOString()
    };
  }

  private toMemberDto(member: TenantMemberRow): TenantMemberDto {
    return {
      id: member.id,
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role as TenantMemberDto["role"],
      isActive: member.isActive,
      userName: member.user.name,
      userEmail: member.user.email
    };
  }

  private async loadTenantOrThrow(tenantId: string): Promise<TenantRow> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Organization not found",
        HttpStatus.NOT_FOUND
      );
    }
    return tenant;
  }

  private async countWorkspaces(tenantId: string): Promise<number> {
    return this.planLimit.getWorkspaceCount(tenantId);
  }

  private async countSeats(tenantId: string): Promise<number> {
    return this.planLimit.getSeatCount(tenantId);
  }

  async getCurrent(userId: string, tenantId: string): Promise<TenantDto> {
    await requireTenantMember(this.prisma, userId, tenantId);
    const tenant = await this.loadTenantOrThrow(tenantId);
    return this.toTenantDto(tenant);
  }

  async getPublicBySlug(slug: string): Promise<PublicTenantDto> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Organization not found",
        HttpStatus.NOT_FOUND
      );
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: normalized } });
    if (!tenant || tenant.status !== "active") {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Organization not found",
        HttpStatus.NOT_FOUND
      );
    }
    return { slug: tenant.slug, name: tenant.name };
  }

  async updateCurrent(
    userId: string,
    tenantId: string,
    dto: UpdateTenantCurrentDto
  ): Promise<TenantDto> {
    await requireTenantOwnerOrAdmin(this.prisma, userId, tenantId);
    const tenant = await this.loadTenantOrThrow(tenantId);

    const nextName = dto.name?.trim() ?? tenant.name;
    const nextSlug = dto.slug?.trim() ?? tenant.slug;

    if (dto.slug && dto.slug !== tenant.slug) {
      const slugTaken = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
      if (slugTaken && slugTaken.id !== tenantId) {
        throw new DomainException(
          ErrorCodes.CONFLICT,
          "Organization slug is already taken",
          HttpStatus.CONFLICT
        );
      }
    }

    const shouldActivate =
      tenant.status === "pending_setup" && nextName.length > 0 && nextSlug.length > 0;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: nextName,
        slug: nextSlug,
        ...(shouldActivate ? { status: "active" } : {})
      }
    });

    return this.toTenantDto(updated);
  }

  async getOverview(userId: string, tenantId: string): Promise<TenantOverviewDto> {
    await requireTenantOwnerInTenant(this.prisma, userId, tenantId);
    const tenant = await this.loadTenantOrThrow(tenantId);
    const [workspaceCount, seatCount, subscription] = await Promise.all([
      this.countWorkspaces(tenantId),
      this.countSeats(tenantId),
      this.subscriptions.getSubscriptionForTenant(tenantId)
    ]);
    return {
      tenant: this.toTenantDto(tenant),
      subscription,
      workspaceCount,
      seatCount
    };
  }

  async listMembers(userId: string, tenantId: string): Promise<TenantMemberDto[]> {
    await requireTenantOwnerOrAdmin(this.prisma, userId, tenantId);
    const members = await this.prisma.tenantMember.findMany({
      where: { tenantId },
      include: { user: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    });
    return members.map((member) => this.toMemberDto(member));
  }

  async inviteMember(
    userId: string,
    tenantId: string,
    dto: InviteTenantMemberDto
  ): Promise<InviteTenantMemberResponseDto> {
    await requireTenantOwnerInTenant(this.prisma, userId, tenantId);
    const tenant = await this.loadTenantOrThrow(tenantId);
    const email = dto.email.trim().toLowerCase();

    await this.planLimit.assertSeatsForEmails(tenantId, [email]);

    const inviter = await this.prisma.user.findUnique({ where: { id: userId } });
    const inviterName = inviter?.name;

    let user = await this.prisma.user.findUnique({ where: { email } });
    let userCreated = false;
    let temporaryPassword: string | undefined;

    if (user) {
      await assertUserNotInOtherTenant(this.prisma, user.id, tenantId);
      const existingMember = await this.prisma.tenantMember.findUnique({
        where: { userId: user.id }
      });
      if (existingMember) {
        throw new DomainException(
          ErrorCodes.MEMBER_ALREADY_EXISTS,
          "User is already an organization member",
          HttpStatus.CONFLICT
        );
      }
    } else {
      const displayName = dto.name.trim();
      const { firstName, lastName } = splitDisplayName(displayName);
      temporaryPassword = generateTempPassword();
      const passwordHash = await hashPassword(temporaryPassword);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: displayName,
          firstName,
          lastName,
          mustChangePassword: true,
          emailVerifiedAt: null
        }
      });
      userCreated = true;
    }

    const membership = await this.prisma.tenantMember.create({
      data: {
        tenantId,
        userId: user.id,
        role: dto.role
      },
      include: { user: true }
    });

    const inviteHandoff =
      userCreated && temporaryPassword
        ? await this.auth.prepareInviteHandoff(user.id, temporaryPassword)
        : undefined;

    await deliverMemberEmail(this.tenantMailer.isConfigured, () =>
      userCreated && temporaryPassword && inviteHandoff
        ? this.tenantMailer.sendTenantAdminCredentials({
            to: email,
            organizationName: tenant.name,
            inviterName,
            temporaryPassword,
            inviteHandoffToken: inviteHandoff.inviteHandoffToken
          })
        : this.tenantMailer.sendTenantAdminAdded({
            to: email,
            organizationName: tenant.name,
            inviterName
          })
    );

    return {
      member: this.toMemberDto(membership),
      userCreated,
      ...(userCreated && temporaryPassword ? { temporaryPassword } : {})
    };
  }

  private async assertCanModifyOwner(
    tenantId: string,
    member: TenantMemberRow,
    dto: UpdateTenantMemberDto
  ): Promise<void> {
    if (member.role !== "OWNER") return;

    const demotingOwner =
      dto.isActive === false || (dto.role !== undefined && dto.role !== "OWNER");
    if (!demotingOwner) return;

    const activeOwners = await this.prisma.tenantMember.count({
      where: { tenantId, role: "OWNER", isActive: true }
    });
    if (activeOwners <= 1) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Cannot remove or demote the last organization owner",
        HttpStatus.FORBIDDEN
      );
    }
  }

  async updateMember(
    userId: string,
    tenantId: string,
    memberId: string,
    dto: UpdateTenantMemberDto
  ): Promise<TenantMemberDto> {
    await requireTenantOwnerInTenant(this.prisma, userId, tenantId);

    const member = await this.prisma.tenantMember.findFirst({
      where: { id: memberId, tenantId },
      include: { user: true }
    });
    if (!member) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Organization member not found",
        HttpStatus.NOT_FOUND
      );
    }

    if (dto.role === "OWNER") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Organization owner cannot be assigned via API",
        HttpStatus.FORBIDDEN
      );
    }

    await this.assertCanModifyOwner(tenantId, member, dto);

    const updated = await this.prisma.tenantMember.update({
      where: { id: member.id },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
      },
      include: { user: true }
    });

    return this.toMemberDto(updated);
  }
}
