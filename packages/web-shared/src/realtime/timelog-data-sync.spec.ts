/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateTimelogQueries } from "../query/invalidate-timelog-queries";
import { resetQueryClient } from "../query/query-client";
import { commitTimelogMutation, invalidateTimelogData } from "./timelog-data-sync";
import { invalidateWorkspaceData } from "./workspace-data-sync";

vi.mock("../api/inflight-requests", () => ({
  clearInflightGetRequestsForPath: vi.fn()
}));

vi.mock("../query/invalidate-timelog-queries", () => ({
  invalidateTimelogQueries: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("./workspace-data-sync", () => ({
  invalidateWorkspaceData: vi.fn()
}));

describe("timelog-data-sync", () => {
  const workspaceId = "00000000-0000-4000-8000-000000000099";

  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryClient();
  });

  it("invalidates inflight requests, query cache, and workspace scopes", async () => {
    await invalidateTimelogData(workspaceId);

    expect(clearInflightGetRequestsForPath).toHaveBeenCalledWith("/timelogs");
    expect(invalidateTimelogQueries).toHaveBeenCalledWith(workspaceId);
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(workspaceId, ["timelogs", "timesheet"]);
  });

  it("runs local refresh before broadcasting stale", async () => {
    const localRefresh = vi.fn().mockResolvedValue(undefined);

    await commitTimelogMutation(workspaceId, localRefresh);

    expect(localRefresh).toHaveBeenCalled();
    expect(invalidateTimelogQueries).toHaveBeenCalledWith(workspaceId);
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(workspaceId, ["timelogs", "timesheet"]);
  });
});
