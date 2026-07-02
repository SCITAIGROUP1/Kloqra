import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { PlanLimitService } from "./plan-limit.service";
import type { SubscriptionsService } from "./subscriptions.service";

describe("PlanLimitService", () => {
  let service: PlanLimitService;
  let mockPrisma: any;
  let mockSubscriptions: SubscriptionsService;
  const tenantId = "t-1";

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        count: vi.fn().mockResolvedValue(3)
      },
      reportingApiCredential: {
        count: vi.fn().mockResolvedValue(5)
      },
      tenantMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: "u1" }])
      },
      workspaceMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: "u2" }])
      },
      user: {
        findUnique: vi.fn()
      }
    };
    mockSubscriptions = {
      getSubscriptionForTenant: vi.fn().mockResolvedValue({
        limits: { maxWorkspaces: 3, maxSeats: 2, maxReportingApiKeys: 5 }
      })
    } as unknown as SubscriptionsService;
    service = new PlanLimitService(mockPrisma, mockSubscriptions);
  });

  it("getSeatCount returns distinct active users across tenant and workspaces", async () => {
    await expect(service.getSeatCount(tenantId)).resolves.toBe(2);
  });

  it("assertWorkspaceCreateAllowed blocks at workspace cap", async () => {
    await expect(service.assertWorkspaceCreateAllowed(tenantId)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.PLAN_LIMIT_EXCEEDED &&
        err.getStatus() === HttpStatus.PAYMENT_REQUIRED
    );
  });

  it("assertSeatsAvailable blocks when additional seats exceed cap", async () => {
    await expect(service.assertSeatsAvailable(tenantId, 1)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.PLAN_LIMIT_EXCEEDED &&
        err.getStatus() === HttpStatus.PAYMENT_REQUIRED
    );
  });

  it("countNewSeatsForEmails ignores users already seated", async () => {
    mockPrisma.user.findUnique.mockImplementation(({ where }: { where: { email: string } }) => {
      if (where.email === "existing@kloqra.dev") return Promise.resolve({ id: "u1" });
      return Promise.resolve(null);
    });

    await expect(
      service.countNewSeatsForEmails(tenantId, ["existing@kloqra.dev", "new@kloqra.dev"])
    ).resolves.toBe(1);
  });

  it("countNewSeatsForEmails dedupes duplicate emails", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.countNewSeatsForEmails(tenantId, ["new@kloqra.dev", "new@kloqra.dev"])
    ).resolves.toBe(1);
  });

  it("assertReportingApiKeysAllowed blocks at reporting API key cap", async () => {
    await expect(service.assertReportingApiKeysAllowed(tenantId)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.PLAN_LIMIT_EXCEEDED &&
        err.getStatus() === HttpStatus.PAYMENT_REQUIRED
    );
  });
});
