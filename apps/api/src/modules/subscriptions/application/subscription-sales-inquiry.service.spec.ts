import { PLAN_SLUGS } from "@kloqra/contracts";
import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingMailer } from "../../../common/mailer/billing.mailer";
import type { PrismaService } from "../../../common/prisma/prisma.service";
import type { PlatformNotificationsDispatchService } from "../../platform/application/platform-notifications-dispatch.service";
import { SubscriptionSalesInquiryService } from "./subscription-sales-inquiry.service";

describe("SubscriptionSalesInquiryService", () => {
  const tenantId = "tenant-1";
  const userId = "user-1";
  const planId = "plan-pilot";

  let prisma: {
    plan: { findUnique: ReturnType<typeof vi.fn> };
    tenantSalesInquiry: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    tenant: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
    tenantMember: { findFirst: ReturnType<typeof vi.fn> };
    tenantSalesInquiryReceipt: { create: ReturnType<typeof vi.fn> };
  };
  let billingMailer: { sendSalesInquiryReceived: ReturnType<typeof vi.fn> };
  let platformNotifications: PlatformNotificationsDispatchService;
  let service: SubscriptionSalesInquiryService;

  beforeEach(() => {
    prisma = {
      plan: { findUnique: vi.fn() },
      tenantSalesInquiry: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      tenant: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
      tenantMember: { findFirst: vi.fn() },
      tenantSalesInquiryReceipt: { create: vi.fn() }
    };
    billingMailer = {
      sendSalesInquiryReceived: vi.fn().mockResolvedValue({ sent: true })
    };
    platformNotifications = {
      notifyAll: vi.fn().mockResolvedValue(undefined)
    } as unknown as PlatformNotificationsDispatchService;
    service = new SubscriptionSalesInquiryService(
      prisma as unknown as PrismaService,
      billingMailer as unknown as BillingMailer,
      platformNotifications
    );
  });

  it("creates inquiry for contact plan", async () => {
    prisma.plan.findUnique.mockResolvedValue({
      id: planId,
      name: "Enterprise",
      slug: PLAN_SLUGS.PILOT,
      billingMode: "contact"
    });
    prisma.tenantSalesInquiry.findFirst.mockResolvedValue(null);
    prisma.tenant.findUnique.mockResolvedValue({
      id: tenantId,
      name: "Acme",
      slug: "acme"
    });
    prisma.user.findUnique.mockResolvedValue({
      id: userId,
      email: "owner@acme.com",
      name: "Owner"
    });
    prisma.tenantSalesInquiry.create.mockResolvedValue({
      id: "inq-1",
      tenantId,
      message: null,
      billingInterval: "monthly",
      status: "open",
      instructionsSentAt: null,
      createdAt: new Date("2026-06-24T12:00:00.000Z"),
      fulfilledAt: null,
      requestedPlan: { slug: PLAN_SLUGS.PILOT, name: "Enterprise", billingMode: "contact" },
      receipts: []
    });

    const result = await service.createInquiry(tenantId, userId, {
      planSlug: PLAN_SLUGS.PILOT,
      billingInterval: "monthly"
    });

    expect(result.status).toBe("open");
    expect(billingMailer.sendSalesInquiryReceived).toHaveBeenCalled();
  });

  it("rejects duplicate open inquiry", async () => {
    prisma.plan.findUnique.mockResolvedValue({
      id: planId,
      billingMode: "contact"
    });
    prisma.tenantSalesInquiry.findFirst.mockResolvedValue({ id: "existing" });

    await expect(
      service.createInquiry(tenantId, userId, { planSlug: PLAN_SLUGS.PILOT })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
