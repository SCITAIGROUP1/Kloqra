"use client";

import { ROUTES, type PresenceSnapshotDto, type ProjectDto } from "@kloqra/contracts";
import { ProjectColorDot, Skeleton } from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { Play } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { usePresenceSnapshot } from "@/hooks/use-presence-snapshot";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export type LivePresenceWidgetProps = {
  projectId?: string | string[];
  userId?: string | string[];
};

export function LivePresenceWidget({ projectId, userId }: LivePresenceWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { snapshot, loading } = usePresenceSnapshot(ws, Boolean(ws));
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const members = snapshot?.members ?? [];

  useEffect(() => {
    if (!ws) return;
    fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws })
      .then((data) => {
        setProjects(data);
        setProjectsLoaded(true);
      })
      .catch(() => {
        setProjects([]);
        setProjectsLoaded(true);
        setError("Failed to load presence feed");
      });
  }, [ws]);

  const filteredMembers = useMemo(() => {
    return members.filter((m: PresenceSnapshotDto["members"][number]) => {
      if (projectId) {
        const pIds = Array.isArray(projectId) ? projectId : [projectId];
        if (pIds.length > 0) {
          const matchedProjectNames = projects
            .filter((p) => pIds.includes(p.id))
            .map((p) => p.name);
          if (!matchedProjectNames.includes(m.projectName)) {
            return false;
          }
        }
      }
      if (userId) {
        const uIds = Array.isArray(userId) ? userId : [userId];
        if (uIds.length > 0 && !uIds.includes(m.userId)) {
          return false;
        }
      }
      return true;
    });
  }, [members, projects, projectId, userId]);
  const [time, setTime] = useState(new Date());

  const isLoading = loading || !projectsLoaded;
  useEffect(() => {
    const ticker = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-6">
        <Skeleton className="h-24 w-full max-w-xs rounded-lg" />
        <p className="text-sm text-muted-foreground">Connecting to presence snapshot…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive font-medium py-6">
        {error}
      </div>
    );
  }

  function formatTimeDiff(startedAtStr: string) {
    try {
      const startedAt = new Date(startedAtStr);
      const diffMs = time.getTime() - startedAt.getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));

      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    } catch {
      return "0:00:00";
    }
  }

  return (
    <div className="space-y-3 pr-1 h-full overflow-auto max-h-[300px]">
      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <p className="text-xs font-semibold">No active sessions</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Nobody on the team is tracking time right now.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredMembers.map((m: PresenceSnapshotDto["members"][number]) => {
            const project = projects.find((p) => p.name === m.projectName);
            const color = project?.color ?? "#94a3b8";

            return (
              <div
                key={m.userId}
                className={`flex items-center justify-between p-2.5 rounded-lg border hover:bg-background/80 transition-all duration-200 ${
                  m.isPaused
                    ? "border-status-warning-border bg-status-warning-bg opacity-80"
                    : "border-border/40 bg-background/40"
                }`}
              >
                <div className="flex flex-col gap-1 min-w-0 max-w-[70%]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="relative flex size-2 shrink-0">
                      {m.isPaused ? (
                        <span className="relative inline-flex size-2 rounded-full bg-warning" />
                      ) : (
                        <>
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-success" />
                        </>
                      )}
                    </span>
                    <span className="font-semibold text-xs text-foreground truncate">
                      {m.userName}
                    </span>
                    {m.isPaused && (
                      <span className="text-[9px] bg-status-warning-bg text-status-warning-fg px-1.5 py-0.2 rounded-full font-medium shrink-0">
                        Break
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground min-w-0">
                    <span className="flex items-center gap-1 shrink-0 truncate max-w-[120px]">
                      <ProjectColorDot color={color} size="sm" />
                      <span className="truncate">{m.projectName || "No Project"}</span>
                    </span>
                    <span className="shrink-0">•</span>
                    <span className="truncate font-medium">{m.taskName || "General Work"}</span>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md border ${
                    m.isPaused
                      ? "bg-status-warning-bg border-status-warning-border text-status-warning-fg"
                      : "bg-primary/5 border-primary/10 text-primary"
                  }`}
                >
                  {m.isPaused ? (
                    <span className="text-xs font-bold font-mono tabular-nums">Paused</span>
                  ) : (
                    <>
                      <Play className="size-3 text-primary animate-pulse stroke-[3px]" />
                      <span className="text-xs font-bold font-mono tabular-nums">
                        {formatTimeDiff(m.startedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LivePresenceWidget;
