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
});
