"use client";

import type { ListTimeLogsResponseDto } from "@kloqra/contracts";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { getAccessToken, useSessionStore } from "../stores/session.store";
import { timelogQueryKeys } from "./timelog-query-keys";

function useTimelogQueryEnabled(workspaceId: string, enabled: boolean): boolean {
  const sessionUserId = useSessionStore((s) => s.session?.user?.id);
  const tokenUserId = readUserIdFromToken(getAccessToken());
  return Boolean(
    enabled && workspaceId && sessionUserId && tokenUserId && sessionUserId === tokenUserId
  );
}

export function useTimelogListQuery(workspaceId: string, path: string, enabled = true) {
  const queryEnabled = useTimelogQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: timelogQueryKeys.list(workspaceId, path),
    queryFn: () => api<ListTimeLogsResponseDto>(path, { workspaceId }),
    enabled: queryEnabled
  });
}

/** Paginate until all items are loaded (time tracker). */
export function useTimelogListAllQuery(workspaceId: string, basePath: string, enabled = true) {
  const queryEnabled = useTimelogQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: timelogQueryKeys.list(workspaceId, `all:${basePath}`),
    queryFn: async () => {
      let allItems: ListTimeLogsResponseDto["items"] = [];
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const separator = basePath.includes("?") ? "&" : "?";
        const path = `${basePath}${cursor ? `${separator}cursor=${encodeURIComponent(cursor)}` : ""}`;
        const res = await api<ListTimeLogsResponseDto>(path, { workspaceId });
        allItems = [...allItems, ...res.items];
        cursor = res.nextCursor;
        hasMore = Boolean(res.nextCursor);
      }

      const seen = new Set<string>();
      const items = allItems.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      return { items } satisfies ListTimeLogsResponseDto;
    },
    enabled: queryEnabled
  });
}
