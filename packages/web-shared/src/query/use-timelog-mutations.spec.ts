/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { commitTimelogMutation } from "../realtime/timelog-data-sync";
import { resetQueryClient } from "./query-client";
import { useTimelogMutations } from "./use-timelog-mutations";

vi.mock("../api/client", () => ({
  api: vi.fn()
}));

vi.mock("../realtime/timelog-data-sync", () => ({
  commitTimelogMutation: vi.fn().mockResolvedValue(undefined),
  invalidateTimelogData: vi.fn().mockResolvedValue(undefined)
}));

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

describe("useTimelogMutations", () => {
  const onLocalRefresh = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryClient();
  });

  it("creates a timelog and commits an upsert patch", async () => {
    vi.mocked(api).mockResolvedValueOnce(sampleLog);
    const { result } = renderHook(() =>
      useTimelogMutations(workspaceId, { onLocalRefresh, projectId: "project-1" })
    );

    let created: TimeLogDto | undefined;
    await act(async () => {
      created = await result.current.create({
        taskId: "task-1",
        startTime: sampleLog.startTime,
        endTime: sampleLog.endTime
      });
    });

    expect(created).toEqual(sampleLog);
    expect(commitTimelogMutation).toHaveBeenCalledWith(workspaceId, onLocalRefresh, {
      type: "upsert",
      log: sampleLog,
      projectId: "project-1"
    });
  });

  it("updates and deletes timelogs with the correct cache patches", async () => {
    vi.mocked(api).mockResolvedValueOnce(sampleLog);
    const { result } = renderHook(() => useTimelogMutations(workspaceId, { onLocalRefresh }));

    await act(async () => {
      await result.current.update("log-1", { description: "updated" });
    });
    expect(commitTimelogMutation).toHaveBeenCalledWith(workspaceId, onLocalRefresh, {
      type: "upsert",
      log: sampleLog,
      projectId: undefined
    });

    vi.mocked(api).mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.remove("log-1");
    });
    expect(commitTimelogMutation).toHaveBeenCalledWith(workspaceId, onLocalRefresh, {
      type: "remove",
      logId: "log-1"
    });
  });

  it("commits upsert without calling the timelog API", async () => {
    const { result } = renderHook(() => useTimelogMutations(workspaceId, { onLocalRefresh }));

    await act(async () => {
      await result.current.commitUpsert(sampleLog);
    });

    expect(api).not.toHaveBeenCalled();
    expect(commitTimelogMutation).toHaveBeenCalledWith(workspaceId, onLocalRefresh, {
      type: "upsert",
      log: sampleLog,
      projectId: undefined
    });
  });
});
