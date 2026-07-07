/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { commitTimelogMutation } from "../realtime/timelog-data-sync";
import { getQueryClient, resetQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

const workspaceId = "00000000-0000-4000-8000-000000000099";
const weekPath = "/timelogs?from=2026-07-06T00:00:00.000Z&to=2026-07-13T00:00:00.000Z";
const otherWeekPath = "/timelogs?from=2026-07-13T00:00:00.000Z&to=2026-07-20T00:00:00.000Z";
const trackerPath = `all:${weekPath}`;

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

describe("timelog cross-view cache sync", () => {
  beforeEach(() => {
    resetQueryClient();
  });

  it("syncs create, delete, and cross-week move across cached views", async () => {
    const client = getQueryClient();
    const timesheetKey = timelogQueryKeys.list(workspaceId, weekPath);
    const dashboardKey = timelogQueryKeys.list(
      workspaceId,
      "/timelogs?from=2026-07-06T00:00:00.000Z&to=2026-07-13T23:59:59.999Z"
    );
    const trackerKey = timelogQueryKeys.list(workspaceId, trackerPath);
    client.setQueryData(timesheetKey, { items: [] });
    client.setQueryData(dashboardKey, { items: [] });
    client.setQueryData(trackerKey, { items: [] });

    await commitTimelogMutation(workspaceId, undefined, { type: "upsert", log: sampleLog });

    expect(client.getQueryData(timesheetKey)).toEqual({ items: [sampleLog] });
    expect(client.getQueryData(dashboardKey)).toEqual({ items: [sampleLog] });
    expect(client.getQueryData(trackerKey)).toEqual({ items: [sampleLog] });

    await commitTimelogMutation(workspaceId, undefined, {
      type: "remove",
      logId: sampleLog.id
    });

    expect(client.getQueryData(timesheetKey)).toEqual({ items: [] });
    expect(client.getQueryData(dashboardKey)).toEqual({ items: [] });
    expect(client.getQueryData(trackerKey)).toEqual({ items: [] });

    client.setQueryData(timesheetKey, { items: [sampleLog] });
    client.setQueryData(timelogQueryKeys.list(workspaceId, otherWeekPath), { items: [] });

    const moved = {
      ...sampleLog,
      startTime: "2026-07-15T02:00:00.000Z",
      endTime: "2026-07-15T03:00:00.000Z"
    };
    await commitTimelogMutation(workspaceId, undefined, { type: "upsert", log: moved });

    expect(client.getQueryData(timesheetKey)).toEqual({ items: [] });
    expect(client.getQueryData(timelogQueryKeys.list(workspaceId, otherWeekPath))).toEqual({
      items: [moved]
    });
  });
});
