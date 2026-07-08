/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { describe, expect, it, beforeEach } from "vitest";
import {
  removeTimelogFromListCaches,
  timelogMatchesListQueryPath,
  upsertTimelogInListCaches
} from "./patch-timelog-list-caches";
import { getQueryClient, resetQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

const workspaceId = "00000000-0000-4000-8000-000000000099";
const weekPath = "/timelogs?from=2026-07-06T00:00:00.000Z&to=2026-07-13T00:00:00.000Z";
const otherWeekPath = "/timelogs?from=2026-07-13T00:00:00.000Z&to=2026-07-20T00:00:00.000Z";
const submissionPath =
  "/timelogs?userId=user-1&projectId=project-1&from=2026-07-06T00:00:00.000Z&to=2026-07-13T00:00:00.000Z";
const allWeekPath = `all:${weekPath}`;

const logA: TimeLogDto = {
  id: "log-a",
  userId: "user-1",
  taskId: "task-1",
  startTime: "2026-07-08T02:00:00.000Z",
  endTime: "2026-07-08T03:00:00.000Z",
  durationSec: 3600,
  description: null,
  isBillable: true,
  source: "manual"
};

const logB: TimeLogDto = {
  ...logA,
  id: "log-b",
  startTime: "2026-07-08T04:00:00.000Z",
  endTime: "2026-07-08T05:00:00.000Z"
};

describe("timelogMatchesListQueryPath", () => {
  it("matches logs inside the query window", () => {
    expect(timelogMatchesListQueryPath(logA, weekPath)).toBe(true);
  });

  it("skips logs outside the query window", () => {
    expect(timelogMatchesListQueryPath(logA, otherWeekPath)).toBe(false);
  });

  it("matches userId and taskId filters when present", () => {
    const filteredPath =
      "/timelogs?userId=user-1&taskId=task-1&from=2026-07-06T00:00:00.000Z&to=2026-07-13T00:00:00.000Z";
    expect(timelogMatchesListQueryPath(logA, filteredPath)).toBe(true);
    expect(timelogMatchesListQueryPath({ ...logA, userId: "user-2" }, filteredPath)).toBe(false);
    expect(timelogMatchesListQueryPath({ ...logA, taskId: "task-2" }, filteredPath)).toBe(false);
  });

  it("requires projectId context for submission-style queries", () => {
    expect(timelogMatchesListQueryPath(logA, submissionPath)).toBe(false);
    expect(timelogMatchesListQueryPath(logA, submissionPath, { projectId: "project-1" })).toBe(
      true
    );
    expect(timelogMatchesListQueryPath(logA, submissionPath, { projectId: "project-2" })).toBe(
      false
    );
  });

  it("parses all-prefixed time tracker query paths", () => {
    expect(timelogMatchesListQueryPath(logA, allWeekPath)).toBe(true);
    expect(timelogMatchesListQueryPath(logA, `all:${otherWeekPath}`)).toBe(false);
  });
});

describe("patchTimelogListCaches", () => {
  beforeEach(() => {
    resetQueryClient();
  });

  it("upserts a new timelog into cached list queries", () => {
    const client = getQueryClient();
    const key = timelogQueryKeys.list(workspaceId, weekPath);
    client.setQueryData(key, { items: [logA] });

    upsertTimelogInListCaches(workspaceId, logB);

    expect(client.getQueryData(key)).toEqual({ items: [logB, logA] });
  });

  it("replaces an existing timelog in cached list queries", () => {
    const client = getQueryClient();
    const key = timelogQueryKeys.list(workspaceId, weekPath);
    client.setQueryData(key, { items: [logA] });

    const updated = { ...logA, description: "updated" };
    upsertTimelogInListCaches(workspaceId, updated);

    expect(client.getQueryData(key)).toEqual({ items: [updated] });
  });

  it("removes a timelog from cached list queries", () => {
    const client = getQueryClient();
    const key = timelogQueryKeys.list(workspaceId, weekPath);
    client.setQueryData(key, { items: [logA, logB] });

    removeTimelogFromListCaches(workspaceId, logA.id);

    expect(client.getQueryData(key)).toEqual({ items: [logB] });
  });

  it("updates every cached range for the workspace (cross-page sync)", () => {
    const client = getQueryClient();
    const timesheetKey = timelogQueryKeys.list(workspaceId, weekPath);
    const dashboardKey = timelogQueryKeys.list(
      workspaceId,
      "/timelogs?from=2026-07-06T00:00:00.000Z&to=2026-07-13T23:59:59.999Z"
    );
    client.setQueryData(timesheetKey, { items: [logA] });
    client.setQueryData(dashboardKey, { items: [logA] });

    upsertTimelogInListCaches(workspaceId, logB);

    expect(client.getQueryData(timesheetKey)).toEqual({ items: [logB, logA] });
    expect(client.getQueryData(dashboardKey)).toEqual({ items: [logB, logA] });
  });

  it("does not add logs to queries outside their date window", () => {
    const client = getQueryClient();
    const inRangeKey = timelogQueryKeys.list(workspaceId, weekPath);
    const outOfRangeKey = timelogQueryKeys.list(workspaceId, otherWeekPath);
    client.setQueryData(inRangeKey, { items: [] });
    client.setQueryData(outOfRangeKey, { items: [] });

    upsertTimelogInListCaches(workspaceId, logA);

    expect(client.getQueryData(inRangeKey)).toEqual({ items: [logA] });
    expect(client.getQueryData(outOfRangeKey)).toEqual({ items: [] });
  });

  it("removes moved logs from the previous date window", () => {
    const client = getQueryClient();
    const oldWeekKey = timelogQueryKeys.list(workspaceId, weekPath);
    const newWeekKey = timelogQueryKeys.list(workspaceId, otherWeekPath);
    client.setQueryData(oldWeekKey, { items: [logA] });
    client.setQueryData(newWeekKey, { items: [] });

    const moved = {
      ...logA,
      startTime: "2026-07-15T02:00:00.000Z",
      endTime: "2026-07-15T03:00:00.000Z"
    };
    upsertTimelogInListCaches(workspaceId, moved);

    expect(client.getQueryData(oldWeekKey)).toEqual({ items: [] });
    expect(client.getQueryData(newWeekKey)).toEqual({ items: [moved] });
  });

  it("patches all-prefixed time tracker list caches", () => {
    const client = getQueryClient();
    const key = timelogQueryKeys.list(workspaceId, allWeekPath);
    client.setQueryData(key, { items: [] });

    upsertTimelogInListCaches(workspaceId, logA);

    expect(client.getQueryData(key)).toEqual({ items: [logA] });
  });

  it("patches explicit list paths even when no cached query exists yet", () => {
    const client = getQueryClient();
    const trackerPath = `all:${weekPath}`;

    upsertTimelogInListCaches(workspaceId, logA, { listPaths: [trackerPath] });

    expect(client.getQueryData(timelogQueryKeys.list(workspaceId, trackerPath))).toEqual({
      items: [logA]
    });
  });

  it("seeds in-flight list queries that are registered but not yet fetched", () => {
    const client = getQueryClient();
    const key = timelogQueryKeys.list(workspaceId, weekPath);
    client
      .getQueryCache()
      .build(client, { queryKey: key, queryFn: () => Promise.resolve({ items: [] }) });

    upsertTimelogInListCaches(workspaceId, logA);

    expect(client.getQueryData(key)).toEqual({ items: [logA] });
  });
});
