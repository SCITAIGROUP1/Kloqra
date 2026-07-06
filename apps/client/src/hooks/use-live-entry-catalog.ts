"use client";

import type { CategoryDto } from "@kloqra/contracts";
import { useRefetchOnWindowFocus } from "@kloqra/web-shared";
import { useCallback, useEffect } from "react";
import { refreshEntryCatalog } from "@/lib/entry-catalog";

type Options = {
  enabled?: boolean;
  /** Poll while the tab is visible (e.g. timer page). */
  pollIntervalMs?: number;
};

/** Keep project/task/category catalog fresh for logging selectors. */
export function useLiveEntryCatalog(
  workspaceId: string,
  onCategories: (categories: CategoryDto[]) => void,
  options: Options = {}
) {
  const { enabled = true, pollIntervalMs } = options;

  const reloadCatalog = useCallback(async () => {
    if (!workspaceId || !enabled) return;
    const data = await refreshEntryCatalog(workspaceId);
    onCategories(data.categories);
  }, [workspaceId, enabled, onCategories]);

  useEffect(() => {
    void reloadCatalog();
  }, [reloadCatalog]);

  useRefetchOnWindowFocus(
    useCallback(() => {
      void reloadCatalog();
    }, [reloadCatalog]),
    Boolean(workspaceId && enabled)
  );

  useEffect(() => {
    if (!workspaceId || !enabled || !pollIntervalMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        void reloadCatalog();
      }
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [workspaceId, enabled, pollIntervalMs, reloadCatalog]);

  return { reloadCatalog };
}
