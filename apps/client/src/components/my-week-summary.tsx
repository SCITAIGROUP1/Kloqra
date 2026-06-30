"use client";

import { ROUTES, type MyWeekSummaryDto, type ProjectDto } from "@kloqra/contracts";
import { Card, CardContent, CardHeader, CardTitle, ProjectColorDot } from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { colorForProject } from "@/lib/project-color-styles";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function MyWeekSummary() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { projects, setProjects } = useProjectsStore();
  const [summary, setSummary] = useState<MyWeekSummaryDto | null>(null);

  useEffect(() => {
    if (!ws) return;
    void api<MyWeekSummaryDto>(ROUTES.REPORTING.ME, { workspaceId: ws }).then(setSummary);
    if (projects.length === 0) {
      void fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    }
  }, [ws, setProjects, projects.length]);

  if (!summary) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My week</CardTitle>
        <p className="text-xs text-muted-foreground">
          {summary.weekStart} – {summary.weekEnd}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Today</p>
            <p className="text-lg font-semibold">{summary.todayHours}h</p>
          </div>
          <div>
            <p className="text-muted-foreground">This week</p>
            <p className="text-lg font-semibold">{summary.weekTotalHours}h</p>
          </div>
          <div>
            <p className="text-muted-foreground">Billable this week</p>
            <p className="text-lg font-semibold">{summary.weekBillableHours}h</p>
          </div>
        </div>
        {summary.byProject.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {summary.byProject.map((p) => (
              <li key={p.projectId} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <ProjectColorDot
                    color={colorForProject(p.projectId, projects, p.projectColor)}
                    size="md"
                  />
                  <span className="truncate font-medium">{p.projectName}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{p.totalHours}h</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No time logged this week yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
