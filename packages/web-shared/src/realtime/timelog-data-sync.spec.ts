/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateTimelogQueries } from "../query/invalidate-timelog-queries";
import { applyTimelogCachePatch } from "../query/patch-timelog-list-caches";
import { getQueryClient, resetQueryClient } from "../query/query-client";
import {
  commitTimelogMutation,
  invalidateTimelogData,
  TIMELOG_DERIVED_INVALIDATE_SCOPES,
  TIMELOG_INVALIDATE_SCOPES
} from "./timelog-data-sync";
import { invalidateWorkspaceData } from "./workspace-data-sync";

vi.mock("../api/inflight-requests", () => ({
  clearInflightGetRequestsForPath: vi.fn()
}));

vi.mock("../query/invalidate-timelog-queries", () => ({
  invalidateTimelogQueries: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../query/patch-timelog-list-caches", () => ({
  applyTimelogCachePatch: vi.fn()
}));

vi.mock("./workspace-data-sync", () => ({
  invalidateWorkspaceData: vi.fn()
}));

describe("timelog-data-sync", () => {
  const workspaceId = "00000000-0000-4000-8000-000000000099";
  const sampleLog: TimeLogDto = {
    id: "log-1",
    userId: "user-1",
    taskId: "task-1",
    startTime: "2026-07-08T02:00:00.000Z",
    endTime: "2026-07-08T03:00:00.000Z",
    durationSec: 3600,
    description: null,
    isBillable: true,
    source: "manual"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryClient();
  });

  it("invalidates inflight requests, query cache, and workspace scopes", async () => {
    await invalidateTimelogData(workspaceId);

    expect(clearInflightGetRequestsForPath).toHaveBeenCalledWith("/timelogs");
    expect(invalidateTimelogQueries).toHaveBeenCalledWith(workspaceId);
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(workspaceId, TIMELOG_INVALIDATE_SCOPES);
  });

  it("runs local refresh before broadcasting stale when no cache patch", async () => {
    const localRefresh = vi.fn().mockResolvedValue(undefined);
    const client = getQueryClient();
    const cancelSpy = vi.spyOn(client, "cancelQueries");

    await commitTimelogMutation(workspaceId, localRefresh);

    expect(cancelSpy).toHaveBeenCalled();
    expect(localRefresh).toHaveBeenCalled();
    expect(invalidateTimelogQueries).toHaveBeenCalledWith(workspaceId);
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(workspaceId, TIMELOG_INVALIDATE_SCOPES);
  });

  it("patches cache, runs local refresh, marks queries stale, and invalidates derived stores", async () => {
    const localRefresh = vi.fn().mockResolvedValue(undefined);
    const patch = { type: "upsert" as const, log: sampleLog };
    const client = getQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    await commitTimelogMutation(workspaceId, localRefresh, patch);

    expect(applyTimelogCachePatch).toHaveBeenCalledOnce();
    expect(applyTimelogCachePatch).toHaveBeenCalledWith(workspaceId, patch);
    expect(localRefresh).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["timelogs", workspaceId],
      refetchType: "none"
    });
    expect(invalidateTimelogQueries).not.toHaveBeenCalled();
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(
      workspaceId,
      TIMELOG_DERIVED_INVALIDATE_SCOPES
    );
  });
});
