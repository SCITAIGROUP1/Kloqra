import { PLAN_IDS, PLAN_SLUGS } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { PlatformTenantsService } from "./platform-tenants.service";

describe("PlatformTenantsService", () => {
  let service: PlatformTenantsService;
  let mockPrisma: any;
  let mockOwnerMailer: {
    sendOwnerCredentials: ReturnType<typeof vi.fn>;
    sendTenantAdminCredentials: ReturnType<typeof vi.fn>;
    isConfigured: boolean;
  };
  let mockAuth: { revokeAllRefreshTokens: ReturnType<typeof vi.fn> };
  let mockStripe: { isConfigured: ReturnType<typeof vi.fn>; getClient: ReturnType<typeof vi.fn> };
  let mockAudit: { recordEvent: ReturnType<typeof vi.fn> };

  const auditCtx = {
    actorPlatformUserId: "00000000-0000-4000-8000-000000000099",
    ipAddress: "127.0.0.1"
  };

  const pilotPlan = {
    id: PLAN_IDS[PLAN_SLUGS.PILOT],
    name: "Pilot",
    slug: PLAN_SLUGS.PILOT,
    limits: { maxWorkspaces: 25, maxSeats: 100, maxReportingApiKeys: 50 },
    isPublic: false,
    sortOrder: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOwnerMailer = {
      sendOwnerCredentials: vi.fn().mockResolvedValue({ sent: false, reason: "unconfigured" }),
      sendTenantAdminCredentials: vi
        .fn()
        .mockResolvedValue({ sent: false, reason: "unconfigured" }),
      isConfigured: false
    };
    mockAuth = {
      revokeAllRefreshTokens: vi.fn().mockResolvedValue(undefined),
      prepareInviteHandoff: vi.fn().mockResolvedValue({
        inviteHandoffToken: "invite-jwt",
        emailVerificationToken: "verify-token"
      }),
      sendEmailVerificationWithToken: vi.fn().mockResolvedValue(undefined)
    };
    mockStripe = {
      isConfigured: vi.fn().mockReturnValue(false),
      getClient: vi.fn()
    };
    mockAudit = { recordEvent: vi.fn().mockResolvedValue(undefined) };
    const mockProvisioning = {
      provisionTenant: vi.fn().mockResolvedValue({
        tenantId: "tenant-new",
        ownerUserId: "user-new",
        temporaryPassword: "TempPass123!"
      })
    };

    mockPrisma = {
      tenant: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "tenant-1",
            name: "Acme",
            slug: "acme",
            status: "active",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            subscription: { status: "active", plan: { slug: "starter", name: "Starter" } },
            _count: { workspaces: 2, members: 3 }
          }
        ]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue({ id: "tenant-1" })
      },
      tenantDataExportJob: {
        findFirst: vi.fn().mockResolvedValue({ id: "export-1", status: "ready" })
      },
      plan: {
        findUnique: vi.fn().mockResolvedValue(pilotPlan),
        findMany: vi.fn().mockResolvedValue([pilotPlan])
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn()
      },
      tenantMember: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn()
      },
      tenantSubscription: {
        create: vi.fn(),
        update: vi.fn()
      },
      workspace: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn()
      },
      workspaceMember: {
        create: vi.fn()
      },
      reportingApiCredential: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma))
    };

    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: "tenant-new",
      name: "Acme",
      slug: "acme",
      status: "pending_setup",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      subscription: {
        status: "trial",
        trialEndsAt: null,
        currentPeriodEnd: null,
        planAssignedAt: new Date("2026-01-01T00:00:00.000Z"),
        plan: { name: "Pilot", slug: PLAN_SLUGS.PILOT }
      },
      members: [{ user: { email: "owner@acme.com" } }],
      _count: { workspaces: 0, members: 1 }
    });

    const mockLifecycle = { recordEvent: vi.fn().mockResolvedValue(undefined) };

    service = new PlatformTenantsService(
      mockPrisma,
      mockOwnerMailer as never,
      mockAuth as never,
      mockStripe as never,
      mockAudit as never,
      mockProvisioning as never,
      { notifyAll: vi.fn().mockResolvedValue(undefined) } as never,
      { fulfillOpenInquiryForPlan: vi.fn().mockResolvedValue(undefined) } as never,
      mockLifecycle as never
    );
  });

  it("lists tenants with counts", async () => {
    const result = await service.listTenants({ page: 1, limit: 25 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe("acme");
    expect(result.items[0]?.workspaceCount).toBe(2);
  });

  it("filters tenants by status and search", async () => {
    await service.listTenants({
      page: 1,
      limit: 25,
      search: "acme",
      status: "active",
      planSlug: "starter",
      subscriptionStatus: "active"
    });

    expect(mockPrisma.tenant.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: "acme", mode: "insensitive" } },
          { slug: { contains: "acme", mode: "insensitive" } }
        ],
        status: "active",
        subscription: {
          plan: { slug: "starter" },
          status: "active"
        }
      }
    });
  });

  it("provisions tenant admin with admin portal credentials email", async () => {
    const mockProvisioning = {
      provisionTenant: vi.fn().mockResolvedValue({
        tenantId: "tenant-new",
        ownerUserId: "user-new",
        temporaryPassword: "OwnerTemp123!",
        tenantAdminUserId: "user-admin",
        tenantAdminTemporaryPassword: "AdminTemp123!"
      })
    };

    const mockLifecycle = { recordEvent: vi.fn().mockResolvedValue(undefined) };
    service = new PlatformTenantsService(
      mockPrisma,
      mockOwnerMailer as never,
      mockAuth as never,
      mockStripe as never,
      mockAudit as never,
      mockProvisioning as never,
      { notifyAll: vi.fn().mockResolvedValue(undefined) } as never,
      { fulfillOpenInquiryForPlan: vi.fn().mockResolvedValue(undefined) } as never,
      mockLifecycle as never
    );

    await service.createTenant(
      {
        organizationName: "ABC",
        ownerEmail: "owner@abc.com",
        tenantAdminEmail: "kloqratenantadmin@yopmail.com",
        planId: pilotPlan.id
      },
      auditCtx
    );

    expect(mockOwnerMailer.sendOwnerCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@abc.com", organizationName: "ABC" })
    );
    expect(mockOwnerMailer.sendTenantAdminCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "kloqratenantadmin@yopmail.com",
        organizationName: "ABC",
        inviterName: "Kloqra Platform",
        temporaryPassword: "AdminTemp123!"
      })
    );
  });

  it("rejects create when owner already belongs to a tenant", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", email: "owner@acme.com" });
    mockPrisma.tenantMember.findUnique.mockResolvedValue({ tenantId: "other-tenant" });

    await expect(
      service.createTenant(
        {
          organizationName: "Acme",
          ownerEmail: "owner@acme.com",
          planId: pilotPlan.id
        },
        auditCtx
      )
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof DomainException && err.getStatus() === HttpStatus.CONFLICT
    );
  });

  it("rejects create when tenant admin already belongs to a tenant", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "user-2", email: "ops@acme.com" });
    mockPrisma.tenantMember.findUnique.mockResolvedValue({ tenantId: "other-tenant" });

    await expect(
      service.createTenant(
        {
          organizationName: "Acme",
          ownerEmail: "owner@acme.com",
          tenantAdminEmail: "ops@acme.com",
          planId: pilotPlan.id
        },
        auditCtx
      )
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof DomainException && err.getStatus() === HttpStatus.CONFLICT
    );
  });

  it("rejects churn unless tenant is suspended", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      status: "active",
      subscription: { stripeSubscriptionId: null, status: "active" }
    });

    await expect(
      service.updateTenant("tenant-1", { status: "churned" }, auditCtx)
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof DomainException && err.getStatus() === HttpStatus.BAD_REQUEST
    );
  });

  it("suspend revokes refresh tokens for tenant users", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      status: "active",
      slug: "acme",
      subscription: {
        id: "sub-1",
        status: "active",
        stripeSubscriptionId: null,
        planAssignedAt: new Date("2026-01-01T00:00:00.000Z"),
        plan: { name: "Pilot", slug: PLAN_SLUGS.PILOT }
      }
    });
    mockPrisma.tenantMember.findMany.mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" }
    ]);
    mockPrisma.tenant.findUnique
      .mockResolvedValueOnce({
        id: "tenant-1",
        status: "active",
        slug: "acme",
        subscription: {
          id: "sub-1",
          status: "active",
          stripeSubscriptionId: null,
          planAssignedAt: new Date("2026-01-01T00:00:00.000Z"),
          plan: { name: "Pilot", slug: PLAN_SLUGS.PILOT }
        }
      })
      .mockResolvedValueOnce({
        id: "tenant-1",
        name: "Acme",
        slug: "acme",
        status: "suspended",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        subscription: {
          status: "suspended",
          trialEndsAt: null,
          currentPeriodEnd: null,
          planAssignedAt: new Date("2026-01-01T00:00:00.000Z"),
          plan: { name: "Pilot", slug: PLAN_SLUGS.PILOT }
        },
        members: [{ user: { email: "owner@acme.com" } }],
        _count: { workspaces: 1, members: 1 }
      });

    await service.suspendTenant("tenant-1", auditCtx);

    expect(mockAuth.revokeAllRefreshTokens).toHaveBeenCalledTimes(2);
    expect(mockAudit.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform.tenant.suspended",
        tenantId: "tenant-1"
      })
    );
  });

  it("deleteTenant removes churned tenant when preconditions pass", async () => {
    process.env.TENANT_DELETE_MIN_DAYS_AFTER_CHURN = "0";
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      name: "Acme",
      slug: "acme",
      status: "churned",
      churnedAt: new Date("2020-01-01T00:00:00.000Z"),
      settings: { exportWaivedAt: "2020-01-02T00:00:00.000Z" },
      subscription: { stripeSubscriptionId: null, status: "canceled" }
    });

    const result = await service.deleteTenant("tenant-1", auditCtx);
    expect(result.ok).toBe(true);
    expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({ where: { id: "tenant-1" } });
    expect(mockAudit.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.tenant.deleted", tenantId: "tenant-1" })
    );
    delete process.env.TENANT_DELETE_MIN_DAYS_AFTER_CHURN;
  });

  describe("extendTrial", () => {
    const trialEndsAt = new Date("2026-07-20T12:00:00.000Z");
    const subscriptionBase = {
      id: "sub-1",
      status: "active",
      trialEndsAt,
      currentPeriodEnd: null,
      currentPeriodStart: null,
      billingInterval: "monthly",
      billingSource: "simulated",
      planAssignedAt: new Date("2026-01-01T00:00:00.000Z"),
      plan: { name: "Pilot", slug: PLAN_SLUGS.PILOT }
    };

    it("extends by days, forces status trial, audits and records lifecycle", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"));
      try {
        const mockLifecycle = { recordEvent: vi.fn().mockResolvedValue(undefined) };
        service = new PlatformTenantsService(
          mockPrisma,
          mockOwnerMailer as never,
          mockAuth as never,
          mockStripe as never,
          mockAudit as never,
          { provisionTenant: vi.fn() } as never,
          { notifyAll: vi.fn().mockResolvedValue(undefined) } as never,
          { fulfillOpenInquiryForPlan: vi.fn().mockResolvedValue(undefined) } as never,
          mockLifecycle as never
        );

        const afterExtend = {
          ...subscriptionBase,
          status: "trial",
          trialEndsAt: new Date("2026-07-27T12:00:00.000Z")
        };

        mockPrisma.tenant.findUnique
          .mockResolvedValueOnce({
            id: "tenant-1",
            name: "Acme",
            slug: "acme",
            status: "active",
            subscription: subscriptionBase
          })
          .mockResolvedValueOnce({
            id: "tenant-1",
            name: "Acme",
            slug: "acme",
            status: "active",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            subscription: afterExtend,
            members: [{ user: { email: "owner@acme.com" } }],
            _count: { workspaces: 1, members: 1 }
          });

        const result = await service.extendTrial("tenant-1", { extendDays: 7 }, auditCtx);

        expect(mockPrisma.tenantSubscription.update).toHaveBeenCalledWith({
          where: { tenantId: "tenant-1" },
          data: expect.objectContaining({
            status: "trial",
            trialEndsAt: new Date("2026-07-27T12:00:00.000Z")
          })
        });
        expect(mockLifecycle.recordEvent).toHaveBeenCalledWith(
          "tenant-1",
          expect.objectContaining({
            eventType: "trial_extended",
            fromStatus: "active",
            toStatus: "trial",
            actorType: "platform_user",
            metadata: expect.objectContaining({ extendDays: 7 })
          }),
          mockPrisma
        );
        expect(mockAudit.recordEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: "platform.tenant.trial_extended",
            tenantId: "tenant-1"
          })
        );
        expect(result.subscription.status).toBe("trial");
        expect(result.subscription.trialEndsAt).toBe("2026-07-27T12:00:00.000Z");
      } finally {
        vi.useRealTimers();
      }
    });

    it("rejects churned tenants", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        status: "churned",
        subscription: subscriptionBase
      });

      await expect(
        service.extendTrial("tenant-1", { extendDays: 7 }, auditCtx)
      ).rejects.toMatchObject({ code: "TRIAL_EXTEND_NOT_ALLOWED" });
    });

    it("rejects canceled subscriptions", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        status: "active",
        subscription: { ...subscriptionBase, status: "canceled" }
      });

      await expect(
        service.extendTrial("tenant-1", { extendDays: 7 }, auditCtx)
      ).rejects.toMatchObject({ code: "TRIAL_EXTEND_NOT_ALLOWED" });
    });

    it("rejects past absolute trialEndsAt", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"));
      try {
        mockPrisma.tenant.findUnique.mockResolvedValue({
          id: "tenant-1",
          status: "active",
          subscription: subscriptionBase
        });

        await expect(
          service.extendTrial("tenant-1", { trialEndsAt: "2020-01-01T00:00:00.000Z" }, auditCtx)
        ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it("createTenant passes billingInterval and trialEndsAt to provisioning", async () => {
    const mockProvisioning = {
      provisionTenant: vi.fn().mockResolvedValue({
        tenantId: "tenant-new",
        ownerUserId: "user-new",
        temporaryPassword: "TempPass123!"
      })
    };
    const mockLifecycle = { recordEvent: vi.fn().mockResolvedValue(undefined) };
    service = new PlatformTenantsService(
      mockPrisma,
      mockOwnerMailer as never,
      mockAuth as never,
      mockStripe as never,
      mockAudit as never,
      mockProvisioning as never,
      { notifyAll: vi.fn().mockResolvedValue(undefined) } as never,
      { fulfillOpenInquiryForPlan: vi.fn().mockResolvedValue(undefined) } as never,
      mockLifecycle as never
    );

    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: "tenant-new",
      name: "Acme",
      slug: "acme",
      status: "pending_setup",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      subscription: {
        status: "trial",
        trialEndsAt: new Date("2026-09-01T00:00:00.000Z"),
        currentPeriodEnd: null,
        currentPeriodStart: null,
        billingInterval: "yearly",
        billingSource: "simulated",
        planAssignedAt: new Date("2026-01-01T00:00:00.000Z"),
        plan: { name: "Pilot", slug: PLAN_SLUGS.PILOT }
      },
      members: [{ user: { email: "owner@acme.com" } }],
      _count: { workspaces: 0, members: 1 }
    });

    await service.createTenant(
      {
        organizationName: "Acme",
        ownerEmail: "owner@acme.com",
        planId: PLAN_IDS[PLAN_SLUGS.PILOT],
        billingInterval: "yearly",
        subscriptionStatus: "trial",
        trialEndsAt: "2026-09-01T23:59:59.000Z"
      },
      auditCtx
    );

    expect(mockProvisioning.provisionTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        billingInterval: "yearly",
        subscriptionStatus: "trial",
        trialEndsAt: new Date("2026-09-01T23:59:59.000Z")
      })
    );
  });

  it("updateTenant applies billingInterval and optional trialEndsAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"));
    try {
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce({
          id: "tenant-1",
          name: "Acme",
          slug: "acme",
          status: "active",
          settings: {},
          subscription: {
            id: "sub-1",
            planId: PLAN_IDS[PLAN_SLUGS.PILOT],
            status: "active",
            billingInterval: "monthly",
            limitsOverride: null
          }
        })
        .mockResolvedValueOnce({
          id: "tenant-1",
          name: "Acme",
          slug: "acme",
          status: "active",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          subscription: {
            status: "trial",
            trialEndsAt: new Date("2026-08-01T23:59:59.000Z"),
            currentPeriodEnd: null,
            currentPeriodStart: null,
            billingInterval: "yearly",
            billingSource: "manual",
            planAssignedAt: new Date("2026-01-01T00:00:00.000Z"),
            plan: { name: "Pilot", slug: PLAN_SLUGS.PILOT }
          },
          members: [{ user: { email: "owner@acme.com" } }],
          _count: { workspaces: 1, members: 1 }
        });
      mockPrisma.tenantSalesInquiry = { findFirst: vi.fn().mockResolvedValue(null) };

      await service.updateTenant(
        "tenant-1",
        {
          billingInterval: "yearly",
          trialEndsAt: "2026-08-01T23:59:59.000Z"
        },
        auditCtx
      );

      expect(mockPrisma.tenantSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: "tenant-1" },
          data: expect.objectContaining({
            billingInterval: "yearly",
            status: "trial",
            trialEndsAt: new Date("2026-08-01T23:59:59.000Z")
          })
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
