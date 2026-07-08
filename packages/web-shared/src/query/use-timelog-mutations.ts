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
  /** Refetch the mounted list query after each mutation (preferred over global invalidation). */
  onLocalRefresh?: () => void | Promise<void>;
  /** When set, patches submission-style list caches filtered by projectId. */
  projectId?: string;
  /** Explicit list cache paths for the view issuing the mutation (e.g. time tracker `all:` key). */
  listPaths?: string[];
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
  const { onLocalRefresh, projectId, listPaths } = options;

  const patchOptions = useMemo(() => ({ projectId, listPaths }), [projectId, listPaths]);

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
        ...patchOptions
      });
      return created;
    },
    [workspaceId, onLocalRefresh, patchOptions]
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
        ...patchOptions
      });
      return updated;
    },
    [workspaceId, onLocalRefresh, patchOptions]
  );

  const remove = useCallback(
    async (id: string) => {
      await api(ROUTES.TIMELOGS.BY_ID(id), { method: "DELETE", workspaceId });
      await commitTimelogMutation(workspaceId, onLocalRefresh, {
        type: "remove",
        logId: id,
        listPaths
      });
    },
    [workspaceId, onLocalRefresh, listPaths]
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
        ...patchOptions
      });
      return res;
    },
    [workspaceId, onLocalRefresh, patchOptions]
  );

  const commitUpsert = useCallback(
    async (log: TimeLogDto) => {
      await commitTimelogMutation(workspaceId, onLocalRefresh, {
        type: "upsert",
        log,
        ...patchOptions
      });
    },
    [workspaceId, onLocalRefresh, patchOptions]
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
