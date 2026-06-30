/** @vitest-environment jsdom */
/* eslint-disable import/order -- vitest mocks must precede subject import */
import { ROUTES } from "@kloqra/contracts";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const workspaceId = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  setProjects: vi.fn(),
  setTasks: vi.fn(),
  invalidateListItemsCache: vi.fn(),
  fetchListItems: vi.fn().mockResolvedValue([])
}));

vi.mock("@/stores/member-data.store", () => ({
  useMySubmissionsStore: {
    getState: () => ({ invalidate: mocks.invalidate })
  }
}));

vi.mock("@/stores/projects.store", () => ({
  useProjectsStore: {
    getState: () => ({ setProjects: mocks.setProjects, setTasks: mocks.setTasks })
  }
}));

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    invalidateListItemsCache: mocks.invalidateListItemsCache,
    fetchListItems: mocks.fetchListItems
  };
});

// Import after mocks — workspace-data-sync pulls mocked @kloqra/web-shared at load time.
import { useClientWorkspaceDataSync } from "./workspace-data-sync";

describe("useClientWorkspaceDataSync", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates submissions when timesheet scope is stale", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");

    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["timesheet"] }
      })
    );

    expect(mocks.invalidate).toHaveBeenCalledWith(workspaceId);
  });

  it("refetches projects and tasks when projects scope is stale", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");
    mocks.fetchListItems.mockResolvedValue([
      { id: "p1", name: "Alpha", color: "#236bfe", isActive: true, timesheetApprovalEnabled: false }
    ] as never);

    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["projects"] }
      })
    );

    await vi.waitFor(() => {
      expect(mocks.invalidateListItemsCache).toHaveBeenCalledWith({ workspaceId });
      expect(mocks.fetchListItems).toHaveBeenCalledWith(ROUTES.PROJECTS.LIST, {
        workspaceId,
        bypassCache: true
      });
      expect(mocks.fetchListItems).toHaveBeenCalledWith(ROUTES.TASKS.LIST, {
        workspaceId,
        bypassCache: true
      });
      expect(mocks.setProjects).toHaveBeenCalled();
      expect(mocks.setTasks).toHaveBeenCalled();
    });
  });

  it("refetches tasks when tasks scope is stale", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");

    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["tasks"] }
      })
    );

    await vi.waitFor(() => {
      expect(mocks.fetchListItems).toHaveBeenCalledWith(ROUTES.TASKS.LIST, {
        workspaceId,
        bypassCache: true
      });
      expect(mocks.setTasks).toHaveBeenCalled();
    });
  });

  it("ignores stale events for other workspaces", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");

    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId: "other-ws", scopes: ["submissions"] }
      })
    );

    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
