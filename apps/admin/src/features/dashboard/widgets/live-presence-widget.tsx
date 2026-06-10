"use client";

import { ROUTES } from "@kloqra/contracts";
import type { PresenceSnapshotDto, ProjectDto } from "@kloqra/contracts";
import { ProjectColorDot } from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { Play } from "lucide-react";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface LivePresenceWidgetProps {
  projectId?: string;
  userId?: string;
}

export function LivePresenceWidget({ projectId, userId }: LivePresenceWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [members, setMembers] = useState<PresenceSnapshotDto["members"]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (projectId) {
        const project = projects.find((p) => p.id === projectId);
        if (!project || m.projectName !== project.name) {
          return false;
        }
      }
      if (userId && m.userId !== userId) {
        return false;
      }
      return true;
    });
  }, [members, projects, projectId, userId]);
  const [time, setTime] = useState(new Date());

  const fetchPresence = useCallback(async () => {
    if (!ws) return;
    try {
      const [snap, projectsData] = await Promise.all([
        api<PresenceSnapshotDto>(ROUTES.PRESENCE.SNAPSHOT, { workspaceId: ws }),
        fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).catch(() => [])
      ]);
      setMembers(snap.members);
      setProjects(projectsData);
    } catch {
      setError("Failed to load presence feed");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void fetchPresence();
    const pollInterval = setInterval(fetchPresence, 15_000); // Poll every 15s
    return () => clearInterval(pollInterval);
  }, [fetchPresence]);

  // Live count-up ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
        Connecting to presence snapshot...
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
          {filteredMembers.map((m) => {
            const project = projects.find((p) => p.name === m.projectName);
            const color = project?.color ?? "#94a3b8";

            return (
              <div
                key={m.userId}
                className={`flex items-center justify-between p-2.5 rounded-lg border hover:bg-background/80 transition-all duration-200 ${
                  m.isPaused
                    ? "border-amber-500/20 bg-amber-500/5 opacity-80"
                    : "border-border/40 bg-background/40"
                }`}
              >
                <div className="flex flex-col gap-1 min-w-0 max-w-[70%]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="relative flex size-2 shrink-0">
                      {m.isPaused ? (
                        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                      ) : (
                        <>
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                        </>
                      )}
                    </span>
                    <span className="font-semibold text-xs text-foreground truncate">
                      {m.userName}
                    </span>
                    {m.isPaused && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded-full font-medium shrink-0">
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
                      ? "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400"
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
