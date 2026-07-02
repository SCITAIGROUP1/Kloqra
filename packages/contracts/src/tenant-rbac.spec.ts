import { describe, expect, it } from "vitest";
import { tenantOverviewSchema, tenantSchema } from "./dto/tenant.dto";
import { ROUTES } from "./routes";
import { planLimitsSchema, subscriptionStatusSchema, tenantMemberRoleSchema } from "./tenant-rbac";

describe("tenant-rbac", () => {
  it("accepts tenant member roles", () => {
    expect(tenantMemberRoleSchema.safeParse("OWNER").success).toBe(true);
    expect(tenantMemberRoleSchema.safeParse("ADMIN").success).toBe(true);
    expect(tenantMemberRoleSchema.safeParse("MEMBER").success).toBe(false);
  });

  it("accepts subscription statuses", () => {
    for (const status of ["trial", "active", "past_due", "suspended", "canceled"] as const) {
      expect(subscriptionStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("validates plan limits", () => {
    const r = planLimitsSchema.safeParse({
      maxWorkspaces: 5,
      maxSeats: 50,
      maxReportingApiKeys: 10
    });
    expect(r.success).toBe(true);
  });

  it("exposes tenant and platform routes", () => {
    expect(ROUTES.TENANTS.CURRENT).toBe("/tenants/current");
    expect(ROUTES.TENANTS.WORKSPACES).toBe("/tenants/current/workspaces");
    expect(ROUTES.PLATFORM.TENANT("t1")).toBe("/platform/tenants/t1");
  });

  it("accepts optional tenant settings", () => {
    const r = tenantSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Acme Agency",
      slug: "acme-agency",
      status: "active",
      settings: { timezone: "America/New_York" },
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    expect(r.success).toBe(true);
  });

  it("validates tenant overview shape", () => {
    const r = tenantOverviewSchema.safeParse({
      tenant: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Acme Agency",
        slug: "acme-agency",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      subscription: {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        planId: "550e8400-e29b-41d4-a716-446655440001",
        planName: "Pilot",
        status: "trial",
        trialEndsAt: "2026-02-01T00:00:00.000Z",
        currentPeriodEnd: null,
        limits: { maxWorkspaces: 10, maxSeats: 100, maxReportingApiKeys: 50 },
        billingMode: "simulated"
      },
      workspaceCount: 2,
      seatCount: 15
    });
    expect(r.success).toBe(true);
  });
});
