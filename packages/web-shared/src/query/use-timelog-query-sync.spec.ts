/** @vitest-environment jsdom */
/* eslint-disable import/order -- vitest mocks must precede subject import */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORKSPACE_DATA_STALE_EVENT } from "../realtime/workspace-data-sync";

const mocks = vi.hoisted(() => ({
  invalidateTimelogQueries: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../query/invalidate-timelog-queries", () => ({
  invalidateTimelogQueries: mocks.invalidateTimelogQueries
}));

import { useTimelogQuerySync } from "./use-timelog-query-sync";

describe("useTimelogQuerySync", () => {
  const workspaceId = "00000000-0000-4000-8000-000000000099";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refetches timelog queries when timelogs scope is stale", () => {
    renderHook(() => useTimelogQuerySync());
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["timelogs"] }
      })
    );
    expect(mocks.invalidateTimelogQueries).toHaveBeenCalledWith(workspaceId);
  });

  it("does not refetch timelog queries for timesheet-only stale events", () => {
    renderHook(() => useTimelogQuerySync());
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["timesheet"] }
      })
    );
    expect(mocks.invalidateTimelogQueries).not.toHaveBeenCalled();
  });
});
