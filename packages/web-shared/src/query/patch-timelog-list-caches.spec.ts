/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { describe, expect, it, beforeEach } from "vitest";
import {
  removeTimelogFromListCaches,
  upsertTimelogInListCaches
} from "./patch-timelog-list-caches";
import { getQueryClient, resetQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

const workspaceId = "00000000-0000-4000-8000-000000000099";
const path = "/timelogs?from=2026-07-01&to=2026-07-08";

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

describe("patchTimelogListCaches", () => {
  beforeEach(() => {
    resetQueryClient();
  });

  it("upserts a new timelog into cached list queries", () => {
    const client = getQueryClient();
    const key = timelogQueryKeys.list(workspaceId, path);
    client.setQueryData(key, { items: [logA] });

    upsertTimelogInListCaches(workspaceId, logB);

    expect(client.getQueryData(key)).toEqual({ items: [logB, logA] });
  });

  it("replaces an existing timelog in cached list queries", () => {
    const client = getQueryClient();
    const key = timelogQueryKeys.list(workspaceId, path);
    client.setQueryData(key, { items: [logA] });

    const updated = { ...logA, description: "updated" };
    upsertTimelogInListCaches(workspaceId, updated);

    expect(client.getQueryData(key)).toEqual({ items: [updated] });
  });

  it("removes a timelog from cached list queries", () => {
    const client = getQueryClient();
    const key = timelogQueryKeys.list(workspaceId, path);
    client.setQueryData(key, { items: [logA, logB] });

    removeTimelogFromListCaches(workspaceId, logA.id);

    expect(client.getQueryData(key)).toEqual({ items: [logB] });
  });
});
