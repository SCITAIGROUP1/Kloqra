import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import type { TenantOwnerProvisioningMailer } from "../../../common/mailer/tenant-owner-provisioning.mailer";
import * as tenantContext from "../../../common/tenant/tenant-context";
import type { PlanLimitService } from "../../subscriptions/application/plan-limit.service";
import type { SubscriptionsService } from "../../subscriptions/application/subscriptions.service";
import { TenantsService } from "./tenants.service";

vi.mock("../../../common/auth/password.util", () => ({
  generateTempPassword: vi.fn().mockReturnValue("TempPass123!"),
  hashPassword: vi.fn().mockResolvedValue("hashed-temp")
}));

describe("TenantsService", () => {
  let service: TenantsService;
  let mockPrisma: any;
  let mockMailer: {
    sendTenantAdminCredentials: ReturnType<typeof vi.fn>;
    sendTenantAdminAdded: ReturnType<typeof vi.fn>;
    isConfigured: boolean;
  };
  let mockSubscriptions: SubscriptionsService;
  let mockPlanLimit: PlanLimitService;
  const tenantId = "t-1";
  const ownerId = "owner-1";

  const tenant = {
    id: tenantId,
    name: "Kloqra Demo Organization",
    slug: "kloqra-demo",
    status: "active",
    settings: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z")
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue(tenant)
      },
      tenantMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn()
      },
      workspace: {
        count: vi.fn().mockResolvedValue(3)
      },
      workspaceMember: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null)
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn()
      }
    };
    mockMailer = {
      sendTenantAdminCredentials: vi.fn().mockResolvedValue({ sent: true }),
      sendTenantAdminAdded: vi.fn().mockResolvedValue({ sent: true }),
      isConfigured: false
    };
    mockSubscriptions = {
      getSubscriptionForTenant: vi.fn().mockResolvedValue({
        tenantId,
        planId: "00000000-0000-4000-8000-000000000001",
        planName: "Pilot",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: null,
        limits: { maxWorkspaces: 25, maxSeats: 100, maxReportingApiKeys: 50 }
      })
    } as unknown as SubscriptionsService;
    mockPlanLimit = {
      getWorkspaceCount: vi.fn().mockResolvedValue(3),
      getSeatCount: vi.fn().mockResolvedValue(2),
      assertSeatsForEmails: vi.fn().mockResolvedValue(undefined)
    } as unknown as PlanLimitService;
    service = new TenantsService(
      mockPrisma,
      mockMailer as unknown as TenantOwnerProvisioningMailer,
      {
        prepareInviteHandoff: vi.fn().mockResolvedValue({
          inviteHandoffToken: "invite-jwt",
          emailVerificationToken: "verify-token"
        }),
        sendEmailVerificationWithToken: vi.fn().mockResolvedValue(undefined)
      } as never,
      mockSubscriptions,
      mockPlanLimit
    );
  });

  it("getCurrent returns tenant dto for active member", async () => {
    mockPrisma.tenantMember.findUnique.mockResolvedValue({
      tenantId,
      role: "OWNER",
      isActive: true
    });

    const result = await service.getCurrent(ownerId, tenantId);

    expect(result.slug).toBe("kloqra-demo");
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("getCurrent rejects workspace-only users", async () => {
    mockPrisma.tenantMember.findUnique.mockResolvedValue(null);

    await expect(service.getCurrent("member-1", tenantId)).rejects.toBeInstanceOf(DomainException);
  });

  it("getPublicBySlug returns active tenant branding", async () => {
    const result = await service.getPublicBySlug("kloqra-demo");

    expect(result).toEqual({
      slug: "kloqra-demo",
      name: "Kloqra Demo Organization"
    });
  });

  it("getPublicBySlug rejects unknown or inactive tenants", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValueOnce({
      ...tenant,
      status: "pending_setup"
    });

    await expect(service.getPublicBySlug("kloqra-demo")).rejects.toBeInstanceOf(DomainException);

    mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);
    await expect(service.getPublicBySlug("missing-org")).rejects.toBeInstanceOf(DomainException);
  });

  it("getOverview returns workspace and seat counts with subscription from service", async () => {
    mockPrisma.tenantMember.findUnique.mockResolvedValue({
      tenantId,
      role: "OWNER",
      isActive: true
    });
    mockPrisma.tenantMember.findMany.mockResolvedValue([{ userId: ownerId }]);
    mockPrisma.workspaceMember.findMany.mockResolvedValue([{ userId: "member-1" }]);

    const result = await service.getOverview(ownerId, tenantId);

    expect(result.workspaceCount).toBe(3);
    expect(result.seatCount).toBe(2);
    expect(result.subscription.status).toBe("active");
    expect(result.subscription.planName).toBe("Pilot");
    expect(mockSubscriptions.getSubscriptionForTenant).toHaveBeenCalledWith(tenantId);
    expect(mockPlanLimit.getWorkspaceCount).toHaveBeenCalledWith(tenantId);
    expect(mockPlanLimit.getSeatCount).toHaveBeenCalledWith(tenantId);
  });

  it("inviteMember checks seat limits before creating user", async () => {
    const limitError = new DomainException(
      ErrorCodes.PLAN_LIMIT_EXCEEDED,
      "Organization seat limit reached (2/2).",
      HttpStatus.PAYMENT_REQUIRED
    );
    mockPrisma.tenantMember.findUnique.mockResolvedValue({
      tenantId,
      role: "OWNER",
      isActive: true
    });
    vi.mocked(mockPlanLimit.assertSeatsForEmails).mockRejectedValue(limitError);

    await expect(
      service.inviteMember(ownerId, tenantId, {
        email: "delegate@kloqra.dev",
        name: "Delegate User",
        role: "ADMIN"
      })
    ).rejects.toBe(limitError);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("inviteMember creates tenant admin for new user", async () => {
    mockMailer.isConfigured = true;
    mockPrisma.tenantMember.findUnique.mockResolvedValue({
      tenantId,
      role: "OWNER",
      isActive: true
    });
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ id: ownerId, name: "Owner" })
      .mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "new-user",
      email: "delegate@kloqra.dev",
      name: "Delegate User"
    });
    mockPrisma.tenantMember.create.mockResolvedValue({
      id: "tm-1",
      tenantId,
      userId: "new-user",
      role: "ADMIN",
      isActive: true,
      user: { name: "Delegate User", email: "delegate@kloqra.dev" }
    });

    const result = await service.inviteMember(ownerId, tenantId, {
      email: "delegate@kloqra.dev",
      name: "Delegate User",
      role: "ADMIN"
    });

    expect(result.userCreated).toBe(true);
    expect(result.member.role).toBe("ADMIN");
    expect(result.temporaryPassword).toBe("TempPass123!");
    expect(mockMailer.sendTenantAdminCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "delegate@kloqra.dev",
        organizationName: tenant.name,
        temporaryPassword: "TempPass123!"
      })
    );
  });

  it("inviteMember rejects users from another organization", async () => {
    vi.spyOn(tenantContext, "assertUserNotInOtherTenant").mockRejectedValue(
      new DomainException(
        ErrorCodes.CONFLICT,
        "User already belongs to another organization",
        HttpStatus.CONFLICT
      )
    );
    mockPrisma.tenantMember.findUnique.mockResolvedValue({
      tenantId,
      role: "OWNER",
      isActive: true
    });
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ id: "other-user", email: "owner-b@kloqra.dev" })
      .mockResolvedValueOnce({ id: ownerId, name: "Owner" });

    await expect(
      service.inviteMember(ownerId, tenantId, {
        email: "owner-b@kloqra.dev",
        name: "Owner B",
        role: "ADMIN"
      })
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it("updateMember blocks deactivating the last owner", async () => {
    mockPrisma.tenantMember.findUnique.mockResolvedValue({
      tenantId,
      role: "OWNER",
      isActive: true
    });
    mockPrisma.tenantMember.findFirst.mockResolvedValue({
      id: "tm-owner",
      tenantId,
      userId: ownerId,
      role: "OWNER",
      isActive: true,
      user: { name: "Owner", email: "admin@kloqra.dev" }
    });
    mockPrisma.tenantMember.count.mockResolvedValue(1);

    await expect(
      service.updateMember(ownerId, tenantId, "tm-owner", { isActive: false })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
