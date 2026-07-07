"use client";

import { ROUTES, type ProjectDto, type TaskDto } from "@kloqra/contracts";
import {
  fetchListItems,
  invalidateListItemsCache,
  invalidateTimelogQueries,
  WORKSPACE_DATA_STALE_EVENT,
  type WorkspaceDataStaleDetail
} from "@kloqra/web-shared";
import { useEffect } from "react";
import {
  useActiveTimerSessionStore,
  useMemberReportingStore,
  useMySubmissionsStore
} from "@/stores/member-data.store";
import { useProjectsStore } from "@/stores/projects.store";

function refetchProjects(workspaceId: string) {
  invalidateListItemsCache({ workspaceId });
  void fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, {
    workspaceId,
    bypassCache: true
  }).then((items) => {
    useProjectsStore.getState().setProjects(workspaceId, items);
  });
}

function refetchTasks(workspaceId: string) {
  invalidateListItemsCache({ workspaceId });
  void fetchListItems<TaskDto>(ROUTES.TASKS.LIST, {
    workspaceId,
    bypassCache: true
  }).then((items) => {
    useProjectsStore.getState().setTasks(workspaceId, items);
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
      if (detail.scopes.includes("timelogs")) {
        void invalidateTimelogQueries(workspaceId);
        useMemberReportingStore.getState().invalidateWeekSummary(workspaceId);
        useActiveTimerSessionStore.getState().invalidateActive(workspaceId);
      } else if (detail.scopes.includes("timesheet")) {
        useMemberReportingStore.getState().invalidateWeekSummary(workspaceId);
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
