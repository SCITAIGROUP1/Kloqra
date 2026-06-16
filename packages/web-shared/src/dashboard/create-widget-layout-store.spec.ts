import { describe, expect, it, vi, beforeEach } from "vitest";
import { createWidgetLayoutStore } from "./create-widget-layout-store";
import { fetchDashboardLayout, saveDashboardLayout } from "./dashboard-layout-api";

vi.mock("./dashboard-layout-api", () => ({
  fetchDashboardLayout: vi.fn(),
  saveDashboardLayout: vi.fn(),
  readLegacyLayouts: vi.fn(() => ({ layout: null, defaultLayout: null })),
  clearLegacyLayouts: vi.fn()
}));

const workspaceId = "ws-1";
const defaultLayout = [{ i: "stat_total_hours", x: 0, y: 0, w: 3, h: 2, visible: true }];
const registry = [
  {
    id: "stat_total_hours",
    defaultVisible: true,
    defaultSize: { w: 3, h: 2 }
  }
];

describe("createWidgetLayoutStore", () => {
  beforeEach(() => {
    vi.mocked(fetchDashboardLayout).mockReset();
    vi.mocked(saveDashboardLayout).mockReset();
  });

  it("loads remote layout on initialize", async () => {
    const remoteLayout = [{ i: "stat_total_hours", x: 1, y: 2, w: 4, h: 3, visible: false }];
    vi.mocked(fetchDashboardLayout).mockResolvedValue({
      layout: remoteLayout,
      defaultLayout: null
    });

    const store = createWidgetLayoutStore({
      app: "client",
      widgetRegistry: registry,
      defaultLayout,
      legacyStorage: {
        layoutKey: () => "layout",
        defaultKey: () => "default"
      }
    });

    await store.getState().initialize(workspaceId);

    expect(store.getState().layoutsByWorkspace[workspaceId]).toEqual(remoteLayout);
  });

  it("dedupes concurrent initialize calls for the same workspace", async () => {
    vi.mocked(fetchDashboardLayout).mockResolvedValue({
      layout: defaultLayout,
      defaultLayout: null
    });

    const store = createWidgetLayoutStore({
      app: "admin",
      widgetRegistry: registry,
      defaultLayout,
      legacyStorage: {
        layoutKey: () => "layout",
        defaultKey: () => "default"
      }
    });

    await Promise.all([
      store.getState().initialize(workspaceId),
      store.getState().initialize(workspaceId)
    ]);

    expect(fetchDashboardLayout).toHaveBeenCalledTimes(1);
  });

  it("persists layout updates to the API", async () => {
    vi.mocked(fetchDashboardLayout).mockResolvedValue({
      layout: defaultLayout,
      defaultLayout: null
    });
    vi.mocked(saveDashboardLayout).mockResolvedValue({
      layout: defaultLayout,
      defaultLayout: null
    });

    const store = createWidgetLayoutStore({
      app: "admin",
      widgetRegistry: registry,
      defaultLayout,
      legacyStorage: {
        layoutKey: () => "layout",
        defaultKey: () => "default"
      }
    });

    await store.getState().initialize(workspaceId);
    await store.getState().persistLayout(workspaceId);

    expect(saveDashboardLayout).toHaveBeenCalledWith(workspaceId, {
      app: "admin",
      layout: defaultLayout
    });
  });

  it("propagates save failures from persistLayout", async () => {
    vi.mocked(fetchDashboardLayout).mockResolvedValue({
      layout: defaultLayout,
      defaultLayout: null
    });
    vi.mocked(saveDashboardLayout).mockRejectedValue(new Error("Network error"));

    const store = createWidgetLayoutStore({
      app: "client",
      widgetRegistry: registry,
      defaultLayout,
      legacyStorage: {
        layoutKey: () => "layout",
        defaultKey: () => "default"
      }
    });

    await store.getState().initialize(workspaceId);

    let errorMessage = "";
    try {
      await store.getState().persistLayout(workspaceId);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    expect(errorMessage).toBe("Network error");
  });

  it("falls back to code defaults when remote load fails", async () => {
    vi.mocked(fetchDashboardLayout).mockRejectedValue(new Error("API unavailable"));

    const store = createWidgetLayoutStore({
      app: "client",
      widgetRegistry: registry,
      defaultLayout,
      legacyStorage: {
        layoutKey: () => "layout",
        defaultKey: () => "default"
      }
    });

    await store.getState().initialize(workspaceId);

    expect(store.getState().layoutsByWorkspace[workspaceId]).toEqual(defaultLayout);
  });

  it("restores layout in memory without persisting", async () => {
    vi.mocked(fetchDashboardLayout).mockResolvedValue({
      layout: defaultLayout,
      defaultLayout: null
    });

    const store = createWidgetLayoutStore({
      app: "admin",
      widgetRegistry: registry,
      defaultLayout,
      legacyStorage: {
        layoutKey: () => "layout",
        defaultKey: () => "default"
      }
    });

    await store.getState().initialize(workspaceId);

    const modifiedLayout = [{ i: "stat_total_hours", x: 5, y: 6, w: 4, h: 3, visible: true }];
    store.getState().updateLayout(workspaceId, modifiedLayout, { persist: false });

    store.getState().restoreLayout(workspaceId, defaultLayout);

    expect(store.getState().layoutsByWorkspace[workspaceId]).toEqual(defaultLayout);
    expect(saveDashboardLayout).not.toHaveBeenCalled();
  });
});
