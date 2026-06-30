"use client";

import { ROUTES, type TeamActivitiesDto } from "@kloqra/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildTeamActivitiesQuery,
  type TeamActivitiesFilters
} from "@/features/dashboard/widgets/team-activities-data";
import { api } from "@/lib/api";

export function useTeamActivities(
  workspaceId: string,
  enabled: boolean,
  filters: TeamActivitiesFilters
) {
  const [data, setData] = useState<TeamActivitiesDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const { from, to, projectId, categoryId, taskId, userId } = filters;

  const refresh = useCallback(async () => {
    if (!workspaceId || !enabled) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const query = buildTeamActivitiesQuery({
        from,
        to,
        projectId,
        categoryId,
        taskId,
        userId
      });
      const res = await api<TeamActivitiesDto>(
        `${ROUTES.WORKSPACES.TEAM_ACTIVITIES(workspaceId)}?${query}`,
        { workspaceId }
      );
      if (requestId !== requestIdRef.current) return;
      setData(res);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("Failed to load team activities");
      setData(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [workspaceId, enabled, from, to, projectId, categoryId, taskId, userId]);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return { data, loading, error, refresh };
}
