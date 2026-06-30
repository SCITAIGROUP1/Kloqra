"use client";

import { ROUTES, type ProjectDto, type TaskDto } from "@kloqra/contracts";
import {
  fetchListItems,
  invalidateListItemsCache,
  WORKSPACE_DATA_STALE_EVENT,
  type WorkspaceDataStaleDetail
} from "@kloqra/web-shared";
import { useEffect } from "react";
import { useMySubmissionsStore } from "@/stores/member-data.store";
import { useProjectsStore } from "@/stores/projects.store";

function refetchProjects(workspaceId: string) {
  invalidateListItemsCache({ workspaceId });
  void fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, {
    workspaceId,
    bypassCache: true
  }).then((items) => {
    useProjectsStore.getState().setProjects(items);
  });
}

function refetchTasks(workspaceId: string) {
  invalidateListItemsCache({ workspaceId });
  void fetchListItems<TaskDto>(ROUTES.TASKS.LIST, {
    workspaceId,
    bypassCache: true
  }).then((items) => {
    useProjectsStore.getState().setTasks(items);
  });
}

export function useClientWorkspaceDataSync(workspaceId: string) {
  useEffect(() => {
    if (!workspaceId) return;

    const onStale = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDataStaleDetail>).detail;
      if (!detail || detail.workspaceId !== workspaceId) return;

      if (detail.scopes.includes("submissions") || detail.scopes.includes("timesheet")) {
        useMySubmissionsStore.getState().invalidate(workspaceId);
      }
      if (detail.scopes.includes("projects")) {
        refetchProjects(workspaceId);
      }
      if (detail.scopes.includes("tasks") || detail.scopes.includes("projects")) {
        refetchTasks(workspaceId);
      }
    };

    window.addEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
  }, [workspaceId]);
}
