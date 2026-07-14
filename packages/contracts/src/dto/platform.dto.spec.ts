import { describe, expect, it } from "vitest";
import {
  createPlatformTenantSchema,
  extendPlatformTenantTrialSchema,
  listPlatformTenantsQuerySchema,
  platformOpsSummarySchema
} from "./platform.dto";

describe("platformOpsSummarySchema", () => {
  it("accepts ops summary payload", () => {
    const result = platformOpsSummarySchema.safeParse({
      tenants: {
        active: 2,
        trial: 1,
        suspended: 0,
        churned: 0,
        pendingSetup: 1
      },
      subscriptions: {
        active: 2,
        trial: 1,
        pastDue: 0,
        canceled: 0
      },
      usage: {
        totalWorkspaces: 3,
        totalSeats: 10
      },
      queues: {
        "mail-queue": { waiting: 0, active: 0, failed: 0, delayed: 0 }
      },
      mrr: { currency: "usd", amountCents: 2900, source: "stripe" },
      reconcile: {
        driftCount: 0,
        lastCheckedAt: "2026-06-24T12:00:00.000Z"
      }
    });
    expect(result.success).toBe(true);
  });
});

describe("createPlatformTenantSchema", () => {
  const base = {
    organizationName: "Acme",
    ownerEmail: "owner@acme.com",
    planId: "00000000-0000-4000-8000-000000000001"
  };

  it("accepts optional tenant admin email", () => {
    expect(
      createPlatformTenantSchema.safeParse({
        ...base,
        tenantAdminEmail: "ops@acme.com"
      }).success
    ).toBe(true);
  });

  it("rejects tenant admin email equal to owner email", () => {
    const result = createPlatformTenantSchema.safeParse({
      ...base,
      tenantAdminEmail: "owner@acme.com"
    });
    expect(result.success).toBe(false);
  });

  it("accepts billingInterval and optional trialEndsAt", () => {
    expect(
      createPlatformTenantSchema.safeParse({
        ...base,
        billingInterval: "yearly",
        subscriptionStatus: "trial",
        trialEndsAt: "2026-08-01T00:00:00.000Z"
      }).success
    ).toBe(true);
  });

  it("rejects trialEndsAt when subscriptionStatus is active", () => {
    expect(
      createPlatformTenantSchema.safeParse({
        ...base,
        subscriptionStatus: "active",
        trialEndsAt: "2026-08-01T00:00:00.000Z"
      }).success
    ).toBe(false);
  });
});

describe("listPlatformTenantsQuerySchema", () => {
  it("accepts pagination and optional filters", () => {
    const result = listPlatformTenantsQuerySchema.safeParse({
      page: 1,
      limit: 25,
      search: "acme",
      status: "active",
      planSlug: "pilot",
      subscriptionStatus: "trial"
    });
    expect(result.success).toBe(true);
  });

  it("defaults page and limit", () => {
    const result = listPlatformTenantsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBeGreaterThan(0);
  });
});

describe("extendPlatformTenantTrialSchema", () => {
  it("accepts extendDays alone", () => {
    expect(extendPlatformTenantTrialSchema.safeParse({ extendDays: 14 }).success).toBe(true);
  });

  it("accepts trialEndsAt alone", () => {
    expect(
      extendPlatformTenantTrialSchema.safeParse({
        trialEndsAt: "2026-08-01T00:00:00.000Z"
      }).success
    ).toBe(true);
  });

  it("rejects neither field", () => {
    expect(extendPlatformTenantTrialSchema.safeParse({}).success).toBe(false);
  });

  it("rejects both fields", () => {
    expect(
      extendPlatformTenantTrialSchema.safeParse({
        extendDays: 7,
        trialEndsAt: "2026-08-01T00:00:00.000Z"
      }).success
    ).toBe(false);
  });

  it("rejects extendDays of 0", () => {
    expect(extendPlatformTenantTrialSchema.safeParse({ extendDays: 0 }).success).toBe(false);
  });

  it("rejects extendDays above 90", () => {
    expect(extendPlatformTenantTrialSchema.safeParse({ extendDays: 91 }).success).toBe(false);
  });
});
