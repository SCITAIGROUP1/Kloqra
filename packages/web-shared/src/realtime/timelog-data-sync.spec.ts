/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateWorkspaceQueries } from "../query/invalidate-workspace-queries";
import { occupancyQueryKeys } from "../query/occupancy-query-keys";
import { applyTimelogCachePatch } from "../query/patch-timelog-list-caches";
import { getQueryClient, resetQueryClient } from "../query/query-client";
import { submissionsQueryKeys } from "../query/submissions-query-keys";
import { timelogQueryKeys } from "../query/timelog-query-keys";
import { weekSummaryQueryKeys } from "../query/week-summary-query-keys";
import {
  commitTimelogMutation,
  invalidateTimelogData,
  TIMELOG_DERIVED_INVALIDATE_SCOPES,
  TIMELOG_MUTATION_SCOPES
} from "./timelog-data-sync";
import {
  clearLocalTimelogMutationEchoGuards,
  invalidateWorkspaceData,
  shouldSuppressLocalTimelogMutationEcho
} from "./workspace-data-sync";

vi.mock("../api/inflight-requests", () => ({
  clearInflightGetRequestsForPath: vi.fn()
}));

vi.mock("../query/invalidate-workspace-queries", () => ({
  invalidateWorkspaceQueries: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../query/patch-timelog-list-caches", () => ({
  applyTimelogCachePatch: vi.fn()
}));

vi.mock("./workspace-data-sync", async () => {
  const actual = await vi.importActual("./workspace-data-sync");
  return {
    ...(actual as Record<string, unknown>),
    invalidateWorkspaceData: vi.fn()
  };
});

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
    clearLocalTimelogMutationEchoGuards();
  });

  it("invalidates inflight requests, query cache, and workspace scopes", async () => {
    await invalidateTimelogData(workspaceId);

    expect(clearInflightGetRequestsForPath).toHaveBeenCalledWith("/timelogs");
    expect(invalidateWorkspaceQueries).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
  });

  it("slow path runs local refresh and full invalidate + broadcast", async () => {
    const localRefresh = vi.fn().mockResolvedValue(undefined);

    await commitTimelogMutation(workspaceId, localRefresh);

    expect(localRefresh).toHaveBeenCalled();
    expect(invalidateWorkspaceQueries).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
  });

  it("fast path patches then refreshes mounted list via localRefresh", async () => {
    const localRefresh = vi.fn().mockResolvedValue(undefined);
    const patch = { type: "upsert" as const, log: sampleLog, listPaths: ["/timelogs?from=a&to=b"] };
    const client = getQueryClient();
    const invalidateSpy = vi
      .spyOn(client, "invalidateQueries")
      .mockResolvedValue(undefined as never);

    await commitTimelogMutation(workspaceId, localRefresh, patch);

    expect(applyTimelogCachePatch).toHaveBeenCalledOnce();
    expect(applyTimelogCachePatch).toHaveBeenCalledWith(workspaceId, patch);
    expect(localRefresh).toHaveBeenCalled();
    expect(invalidateWorkspaceQueries).not.toHaveBeenCalled();
    expect(invalidateWorkspaceData).not.toHaveBeenCalled();
    expect(TIMELOG_DERIVED_INVALIDATE_SCOPES).toEqual(["submissions", "timesheet"]);

    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: timelogQueryKeys.workspace(workspaceId),
      refetchType: "active"
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: submissionsQueryKeys.workspace(workspaceId),
      refetchType: "none"
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: occupancyQueryKeys.workspace(workspaceId),
      refetchType: "active"
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: weekSummaryQueryKeys.workspace(workspaceId),
      refetchType: "active"
    });
  });

  it("fast path refetches active list queries when no localRefresh is provided", async () => {
    const patch = { type: "upsert" as const, log: sampleLog };
    const client = getQueryClient();
    const invalidateSpy = vi
      .spyOn(client, "invalidateQueries")
      .mockResolvedValue(undefined as never);

    await commitTimelogMutation(workspaceId, undefined, patch);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: timelogQueryKeys.workspace(workspaceId),
      refetchType: "active"
    });
  });

  it("arms local mutation echo suppression so socket self-echo is ignored", async () => {
    await commitTimelogMutation(workspaceId, undefined, {
      type: "upsert",
      log: sampleLog
    });

    expect(shouldSuppressLocalTimelogMutationEcho(workspaceId, ["timelogs", "timesheet"])).toBe(
      true
    );
  });

  it("fast path refetches mounted observers when no localRefresh is provided", async () => {
    const client = getQueryClient();
    const { QueryObserver } = await import("@tanstack/react-query");
    const activeKey = timelogQueryKeys.list(workspaceId, "/timelogs?from=a&to=b");
    const inactiveKey = timelogQueryKeys.list(workspaceId, "/timelogs?from=c&to=d");

    let activeFetches = 0;

    const observer = new QueryObserver(client, {
      queryKey: activeKey,
      queryFn: async () => {
        activeFetches += 1;
        return { items: [] };
      }
    });
    const unsubActive = observer.subscribe(() => undefined);
    await observer.refetch();
    const fetchesAfterMount = activeFetches;

    client.setQueryData(inactiveKey, { items: [{ id: "old" }] });

    await commitTimelogMutation(workspaceId, undefined, {
      type: "upsert",
      log: sampleLog
    });

    expect(activeFetches).toBeGreaterThan(fetchesAfterMount);
    expect(client.getQueryState(inactiveKey)?.isInvalidated).toBe(true);

    unsubActive();
  });
});
