/** @vitest-environment jsdom */
/* eslint-disable import/order -- vitest mocks must precede subject import */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const workspaceId = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  refreshEntryCatalog: vi.fn().mockResolvedValue({ projects: [], tasks: [], categories: [] }),
  WORKSPACE_DATA_STALE_EVENT: "kloqra:workspace-data-stale"
}));

vi.mock("@/stores/member-data.store", () => ({
  useMySubmissionsStore: {
    getState: () => ({ invalidate: mocks.invalidate })
  }
}));

vi.mock("./entry-catalog", () => ({
  refreshEntryCatalog: mocks.refreshEntryCatalog
}));

vi.mock("@kloqra/web-shared", () => ({
  WORKSPACE_DATA_STALE_EVENT: mocks.WORKSPACE_DATA_STALE_EVENT
}));

// Import after mocks — workspace-data-sync pulls mocked modules at load time.
import { useClientWorkspaceDataSync } from "./workspace-data-sync";

describe("useClientWorkspaceDataSync", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates submissions when timesheet scope is stale", () => {
    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(mocks.WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["timesheet"] }
      })
    );

    expect(mocks.invalidate).toHaveBeenCalledWith(workspaceId);
    expect(mocks.refreshEntryCatalog).not.toHaveBeenCalled();
  });

  it("refetches full catalog when projects scope is stale", async () => {
    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(mocks.WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["projects"] }
      })
    );

    await vi.waitFor(() => {
      expect(mocks.refreshEntryCatalog).toHaveBeenCalledWith(workspaceId);
    });
  });

  it("refetches full catalog when tasks scope is stale", async () => {
    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(mocks.WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["tasks"] }
      })
    );

    await vi.waitFor(() => {
      expect(mocks.refreshEntryCatalog).toHaveBeenCalledWith(workspaceId);
    });
  });

  it("refetches full catalog when categories scope is stale", async () => {
    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(mocks.WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["categories"] }
      })
    );

    await vi.waitFor(() => {
      expect(mocks.refreshEntryCatalog).toHaveBeenCalledWith(workspaceId);
    });
  });

  it("ignores stale events for other workspaces", () => {
    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(mocks.WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId: "other-ws", scopes: ["submissions"] }
      })
    );

    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.refreshEntryCatalog).not.toHaveBeenCalled();
  });
});
