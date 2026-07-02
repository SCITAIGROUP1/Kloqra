import { describe, expect, it } from "vitest";
import { tenantAnalyticsQuerySchema, tenantAnalyticsSummarySchema } from "./tenant-analytics.dto";

describe("tenantAnalyticsQuerySchema", () => {
  it("accepts valid date range", () => {
    const result = tenantAnalyticsQuerySchema.safeParse({
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T23:59:59.999Z"
    });
    expect(result.success).toBe(true);
  });

  it("rejects inverted range", () => {
    const result = tenantAnalyticsQuerySchema.safeParse({
      from: "2026-02-01T00:00:00.000Z",
      to: "2026-01-01T00:00:00.000Z"
    });
    expect(result.success).toBe(false);
  });
});

describe("tenantAnalyticsSummarySchema", () => {
  it("accepts summary shape", () => {
    const result = tenantAnalyticsSummarySchema.safeParse({
      period: {
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-31T23:59:59.999Z"
      },
      totals: {
        totalHours: 120,
        billableHours: 100,
        billableAmount: 15000,
        billablePercent: 83.33,
        activeMembers: 5,
        activeWorkspaces: 2,
        currency: "USD"
      },
      byWorkspace: [
        {
          workspaceId: "00000000-0000-4000-8000-000000000001",
          workspaceName: "Main",
          totalHours: 120,
          billableHours: 100,
          billableAmount: 15000,
          billablePercent: 83.33,
          activeMembers: 5
        }
      ]
    });
    expect(result.success).toBe(true);
  });
});
