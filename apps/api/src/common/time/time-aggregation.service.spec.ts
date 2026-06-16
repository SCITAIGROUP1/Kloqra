import { Decimal } from "@prisma/client/runtime/library";
import { describe, expect, it, vi } from "vitest";
import { TimeAggregationService } from "./time-aggregation.service";

describe("TimeAggregationService.resolveRateMaps", () => {
  it("resolves time-scoped rates with correct precedence (project > user > default)", async () => {
    const mockRates = [
      // Project rates
      {
        projectId: "proj-1",
        userId: null,
        rate: new Decimal("120.00"),
        effectiveFrom: new Date("2024-01-01T00:00:00.000Z")
      },
      {
        projectId: "proj-1",
        userId: null,
        rate: new Decimal("150.00"),
        effectiveFrom: new Date("2024-02-01T00:00:00.000Z")
      },
      // User rates
      {
        projectId: null,
        userId: "user-1",
        rate: new Decimal("80.00"),
        effectiveFrom: new Date("2024-01-01T00:00:00.000Z")
      },
      {
        projectId: null,
        userId: "user-1",
        rate: new Decimal("90.00"),
        effectiveFrom: new Date("2024-02-01T00:00:00.000Z")
      }
    ];

    const mockPrisma = {
      hourlyRate: {
        findMany: vi.fn().mockResolvedValue(mockRates)
      }
    };

    const service = new TimeAggregationService(mockPrisma as any);
    const { resolveRate } = await service.resolveRateMaps("ws-1");

    // Test time scoping: Jan 31 should use Jan 1 rate, Feb 1 should use Feb 1 rate
    expect(resolveRate("user-1", "proj-1", 50, new Date("2024-01-31T23:59:59Z"))).toBe(120);
    expect(resolveRate("user-1", "proj-1", 50, new Date("2024-02-01T00:00:00Z"))).toBe(150);

    // Test project rate precedence over user rate: project rate wins
    expect(resolveRate("user-1", "proj-1", 50, new Date("2024-02-15T00:00:00Z"))).toBe(150);

    // Test user rate fallback when project rate doesn't exist
    expect(resolveRate("user-1", "proj-2", 50, new Date("2024-02-15T00:00:00Z"))).toBe(90);

    // Test default rate fallback when no project or user rate is active/defined
    expect(resolveRate("user-2", "proj-2", 50, new Date("2024-02-15T00:00:00Z"))).toBe(50);

    // Test zero fallback when defaultRate is null and no other rate matches
    expect(resolveRate("user-2", "proj-2", null, new Date("2024-02-15T00:00:00Z"))).toBe(0);
  });
});
