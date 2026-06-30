import { describe, expect, it, vi, beforeEach } from "vitest";
import { BillingService } from "./billing.service";

describe("BillingService", () => {
  let service: BillingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      hourlyRate: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "r1",
            workspaceId: "ws-1",
            userId: null,
            projectId: null,
            rate: { toNumber: () => 100 },
            effectiveFrom: new Date("2025-01-01T00:00:00.000Z")
          }
        ]),
        create: vi.fn()
      }
    };
    service = new BillingService(mockPrisma, {} as never, {} as never);
  });

  it("returns paginated hourly rates", async () => {
    const result = await service.listRates("ws-1", { page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockPrisma.hourlyRate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
  });

  it("filters workspace-default rates when scope is workspace", async () => {
    await service.listRates("ws-1", { page: 1, limit: 20, scope: "workspace" });

    expect(mockPrisma.hourlyRate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws-1", userId: null, projectId: null }
      })
    );
  });

  it("summary aggregates billable totals from time logs", async () => {
    mockPrisma.workspace = {
      findUnique: vi.fn().mockResolvedValue({ settings: { currency: "EUR" } })
    };
    const mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([]),
      resolveRateMaps: vi.fn().mockResolvedValue({
        resolveRate: () => 100
      }),
      buildAggregates: vi.fn().mockReturnValue({
        workspaceAgg: { totalHours: 1, billableHours: 1, billableAmount: 100 }
      })
    };
    const mockReportCache = {
      billingKey: vi.fn().mockReturnValue("billing-key"),
      getBilling: vi.fn().mockResolvedValue(null),
      setBilling: vi.fn().mockResolvedValue(undefined)
    };
    service = new BillingService(mockPrisma, mockAggregation as never, mockReportCache as never);

    const result = await service.summary("ws-1", { from: "2025-01-01", to: "2025-01-31" });

    expect(result.totalHours).toBe(1);
    expect(result.currency).toBe("EUR");
    expect(mockReportCache.setBilling).toHaveBeenCalled();
  });
});
