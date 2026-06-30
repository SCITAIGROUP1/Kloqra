import { describe, expect, it } from "vitest";
import {
  getWorkspaceDashboardLayout,
  mergeDashboardLayoutUpdate,
  updateDashboardLayoutSchema
} from "./dashboard-layout";
import { parseUserPreferences } from "./user-preferences";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const layout = [{ i: "stat_total_hours", x: 0, y: 0, w: 3, h: 2, visible: true }];

describe("dashboard-layout", () => {
  it("merges layout per workspace and app", () => {
    const merged = mergeDashboardLayoutUpdate(parseUserPreferences({}), workspaceId, {
      app: "client",
      layout
    });
    expect(getWorkspaceDashboardLayout(merged, workspaceId, "client").layout).toEqual(layout);
    expect(getWorkspaceDashboardLayout(merged, workspaceId, "admin").layout).toBeUndefined();
  });

  it("preserves other workspaces when updating one", () => {
    const otherId = "00000000-0000-4000-8000-000000000002";
    const base = mergeDashboardLayoutUpdate(parseUserPreferences({}), otherId, {
      app: "admin",
      layout
    });
    const merged = mergeDashboardLayoutUpdate(base, workspaceId, {
      app: "client",
      defaultLayout: layout
    });
    expect(getWorkspaceDashboardLayout(merged, otherId, "admin").layout).toEqual(layout);
    expect(getWorkspaceDashboardLayout(merged, workspaceId, "client").defaultLayout).toEqual(
      layout
    );
  });

  it("requires layout or defaultLayout on update", () => {
    const result = updateDashboardLayoutSchema.safeParse({ app: "client" });
    expect(result.success).toBe(false);
  });
});
