import { widgetLayoutItemSchema } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  SEED_ADMIN_DASHBOARD_LAYOUT,
  SEED_CLIENT_DASHBOARD_LAYOUT,
  buildPreferencesWithDashboardLayouts
} from "./seed-dashboard-layouts";

const workspaceId = "00000000-0000-4000-8000-000000000001";

describe("seed-dashboard-layouts", () => {
  it("defines valid widget layout items", () => {
    for (const item of [...SEED_CLIENT_DASHBOARD_LAYOUT, ...SEED_ADMIN_DASHBOARD_LAYOUT]) {
      expect(widgetLayoutItemSchema.safeParse(item).success).toBe(true);
    }
  });

  it("merges seeded layouts into user preferences by workspace", () => {
    const merged = buildPreferencesWithDashboardLayouts(
      { dailyTargetHours: 8 },
      workspaceId,
      "client",
      SEED_CLIENT_DASHBOARD_LAYOUT,
      SEED_CLIENT_DASHBOARD_LAYOUT
    );

    expect(merged.dailyTargetHours).toBe(8);
    expect(merged.dashboardLayouts?.[workspaceId]?.client?.layout).toEqual(
      SEED_CLIENT_DASHBOARD_LAYOUT
    );
  });

  it("includes pending_timesheets as a visible widget in the admin default layout", () => {
    const pending = SEED_ADMIN_DASHBOARD_LAYOUT.find((item) => item.i === "pending_timesheets");
    expect(pending?.visible).toBe(true);
    expect(pending).toMatchObject({ x: 0, y: 17, w: 12, h: 5 });
  });

  it("includes category_split as a visible widget in the member default layout", () => {
    const categorySplit = SEED_CLIENT_DASHBOARD_LAYOUT.find((item) => item.i === "category_split");
    expect(categorySplit?.visible).toBe(true);
    expect(categorySplit).toMatchObject({ x: 8, y: 10, w: 4, h: 4 });
  });
});
