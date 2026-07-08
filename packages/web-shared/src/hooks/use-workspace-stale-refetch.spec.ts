/** @vitest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalTimelogMutationEchoGuards,
  noteLocalTimelogMutation,
  WORKSPACE_DATA_STALE_EVENT
} from "../realtime/workspace-data-sync";
import { useWorkspaceStaleRefetch } from "./use-workspace-stale-refetch";

const workspaceId = "22222222-2222-4222-8222-222222222222";

describe("useWorkspaceStaleRefetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearLocalTimelogMutationEchoGuards();
  });

  it("runs callback when a watched scope becomes stale", () => {
    const callback = vi.fn();
    renderHook(() => useWorkspaceStaleRefetch(workspaceId, ["tasks"], callback));

    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["tasks"] }
      })
    );

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignores stale events for other workspaces or scopes", () => {
    const callback = vi.fn();
    renderHook(() => useWorkspaceStaleRefetch(workspaceId, ["tasks"], callback));

    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId: "other-ws", scopes: ["tasks"] }
      })
    );
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["submissions"] }
      })
    );

    expect(callback).not.toHaveBeenCalled();
  });

  it("suppresses local timelog mutation echo (no stacked refetch)", () => {
    const callback = vi.fn();
    noteLocalTimelogMutation(workspaceId);
    renderHook(() => useWorkspaceStaleRefetch(workspaceId, ["timelogs"], callback));

    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["timelogs", "timesheet", "submissions"] }
      })
    );

    expect(callback).not.toHaveBeenCalled();
  });
});
