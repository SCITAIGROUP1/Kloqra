import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlatformCatalogSettingsService } from "./platform-catalog-settings.service";

describe("PlatformCatalogSettingsService", () => {
  let service: PlatformCatalogSettingsService;
  let mockPrisma: {
    platformCatalogSettings: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
  };
  let mockAudit: { recordEvent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAudit = { recordEvent: vi.fn() };
    mockPrisma = {
      platformCatalogSettings: {
        findUnique: vi.fn(),
        upsert: vi.fn()
      }
    };
    service = new PlatformCatalogSettingsService(mockPrisma as never, mockAudit as never);
  });

  it("returns seeded baseline features", async () => {
    mockPrisma.platformCatalogSettings.findUnique.mockResolvedValue({
      pricingBaselineFeatures: ["Time tracking and timesheets", "Exports and reporting"]
    });

    const result = await service.getSettings();
    expect(result.pricingBaselineFeatures).toEqual([
      "Time tracking and timesheets",
      "Exports and reporting"
    ]);
  });

  it("updates baseline features", async () => {
    mockPrisma.platformCatalogSettings.upsert.mockResolvedValue({
      pricingBaselineFeatures: ["Custom feature"]
    });

    const result = await service.updateSettings(
      { pricingBaselineFeatures: ["Custom feature"] },
      { platformUserId: "u1", ipAddress: null, userAgent: null }
    );

    expect(result.pricingBaselineFeatures).toEqual(["Custom feature"]);
    expect(mockAudit.recordEvent).toHaveBeenCalled();
  });
});
