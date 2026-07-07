"use client";

import {
  ROUTES,
  type BatchTimeLogsResponseDto,
  type CreateBatchTimeLogsDto,
  type CreateTimeLogDto,
  type TimeLogDto,
  type UpdateTimeLogDto
} from "@kloqra/contracts";
import { useCallback, useMemo } from "react";
import { api } from "../api/client";
import { commitTimelogMutation } from "../realtime/timelog-data-sync";

export type UseTimelogMutationsOptions = {
  /** Refresh view-local state (e.g. timesheet occupancy) after each mutation. */
  onLocalRefresh?: () => void | Promise<void>;
  /** When set, patches submission-style list caches filtered by projectId. */
  projectId?: string;
};

export type TimelogMutations = {
  create: (body: CreateTimeLogDto) => Promise<TimeLogDto>;
  update: (id: string, body: UpdateTimeLogDto) => Promise<TimeLogDto>;
  remove: (id: string) => Promise<void>;
  createBatch: (body: CreateBatchTimeLogsDto) => Promise<BatchTimeLogsResponseDto>;
  /** Sync caches when the API already returned the timelog (timer stop, duplicate, etc.). */
  commitUpsert: (log: TimeLogDto) => Promise<void>;
  /** Full invalidation when no patch is available (timer autostop). */
  invalidateAll: () => Promise<void>;
};

export function useTimelogMutations(
  workspaceId: string,
  options: UseTimelogMutationsOptions = {}
): TimelogMutations {
  const { onLocalRefresh, projectId } = options;

  const create = useCallback(
    async (body: CreateTimeLogDto) => {
      const created = await api<TimeLogDto>(ROUTES.TIMELOGS.CREATE, {
        method: "POST",
        workspaceId,
        body: JSON.stringify(body)
      });
      await commitTimelogMutation(workspaceId, onLocalRefresh, {
        type: "upsert",
        log: created,
        projectId
      });
      return created;
    },
    [workspaceId, onLocalRefresh, projectId]
  );

  const update = useCallback(
    async (id: string, body: UpdateTimeLogDto) => {
      const updated = await api<TimeLogDto>(ROUTES.TIMELOGS.BY_ID(id), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify(body)
      });
      await commitTimelogMutation(workspaceId, onLocalRefresh, {
        type: "upsert",
        log: updated,
        projectId
      });
      return updated;
    },
    [workspaceId, onLocalRefresh, projectId]
  );

  const remove = useCallback(
    async (id: string) => {
      await api(ROUTES.TIMELOGS.BY_ID(id), { method: "DELETE", workspaceId });
      await commitTimelogMutation(workspaceId, onLocalRefresh, {
        type: "remove",
        logId: id
      });
    },
    [workspaceId, onLocalRefresh]
  );

  const createBatch = useCallback(
    async (body: CreateBatchTimeLogsDto) => {
      const res = await api<BatchTimeLogsResponseDto>(ROUTES.TIMELOGS.CREATE_BATCH, {
        method: "POST",
        workspaceId,
        body: JSON.stringify(body)
      });
      await commitTimelogMutation(workspaceId, onLocalRefresh, {
        type: "upsertMany",
        logs: res.items,
        projectId
      });
      return res;
    },
    [workspaceId, onLocalRefresh, projectId]
  );

  const commitUpsert = useCallback(
    async (log: TimeLogDto) => {
      await commitTimelogMutation(workspaceId, onLocalRefresh, {
        type: "upsert",
        log,
        projectId
      });
    },
    [workspaceId, onLocalRefresh, projectId]
  );

  const invalidateAll = useCallback(async () => {
    await commitTimelogMutation(workspaceId, onLocalRefresh);
  }, [workspaceId, onLocalRefresh]);

  return useMemo(
    () => ({
      create,
      update,
      remove,
      createBatch,
      commitUpsert,
      invalidateAll
    }),
    [create, update, remove, createBatch, commitUpsert, invalidateAll]
  );
}
