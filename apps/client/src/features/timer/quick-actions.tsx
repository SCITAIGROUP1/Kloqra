"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TimeLogDto, ListTimeLogsResponseDto } from "@kloqra/contracts";
import { Card, CardContent, CardHeader, CardTitle, Button, ProjectColorDot } from "@kloqra/ui";
import { Star, History, Pin, PinOff, Clock, TrendingUp } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface QuickActionsProps {
  onSelect: (projectId: string, taskId: string) => void;
  currentProjectId?: string;
  currentTaskId?: string;
  filterProjectId?: string;
  mode?: "favorites" | "recents" | "all";
}

interface FavoriteItem {
  projectId: string;
  taskId: string;
  projectName: string;
  taskName: string;
  projectColor: string;
}

interface RecentItem {
  projectId: string;
  taskId: string;
  projectName: string;
  taskName: string;
  projectColor: string;
  categoryName?: string;
}

export function QuickActions({
  onSelect,
  currentProjectId,
  currentTaskId,
  filterProjectId,
  mode = "all"
}: QuickActionsProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { projects, tasks } = useProjectsStore();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [yesterday, setYesterday] = useState<{
    totalSec: number;
    billableSec: number;
    topTask: string | null;
    logCount: number;
  } | null>(null);

  const filteredFavorites = useMemo(() => {
    if (!filterProjectId) return favorites;
    return favorites.filter((f) => f.projectId === filterProjectId);
  }, [favorites, filterProjectId]);

  const filteredRecents = useMemo(() => {
    if (!filterProjectId) return recents;
    return recents.filter((r) => r.projectId === filterProjectId);
  }, [recents, filterProjectId]);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("kloqra_favorites");
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (items: FavoriteItem[]) => {
    setFavorites(items);
    try {
      localStorage.setItem("kloqra_favorites", JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  // Fetch recent time logs to build recents list
  const fetchRecents = useCallback(async () => {
    if (!ws || projects.length === 0 || tasks.length === 0) return;
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const params = new URLSearchParams({
        from: oneWeekAgo.toISOString(),
        to: new Date().toISOString()
      });
      const res = await api<ListTimeLogsResponseDto>(`${ROUTES.TIMELOGS.LIST}?${params}`, {
        workspaceId: ws
      });

      // Group by taskId and count frequencies
      const counts: Record<string, number> = {};
      const logMap: Record<string, TimeLogDto> = {};

      for (const log of res.items) {
        counts[log.taskId] = (counts[log.taskId] ?? 0) + 1;
        logMap[log.taskId] = log;
      }

      const sortedTaskIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

      const recentItems: RecentItem[] = [];
      for (const tId of sortedTaskIds.slice(0, 3)) {
        const task = tasks.find((t) => t.id === tId);
        if (task) {
          const project = projects.find((p) => p.id === task.projectId);
          if (project) {
            recentItems.push({
              projectId: project.id,
              taskId: task.id,
              projectName: project.name,
              taskName: task.taskName,
              projectColor: project.color,
              categoryName: task.categoryName
            });
          }
        }
      }
      setRecents(recentItems);
    } catch {
      // ignore
    }
  }, [ws, projects, tasks]);

  useEffect(() => {
    void fetchRecents();
  }, [fetchRecents]);

  // Fetch yesterday summary
  useEffect(() => {
    if (!ws) return;
    api<{ totalSec: number; billableSec: number; topTask: string | null; logCount: number }>(
      ROUTES.TIMELOGS.YESTERDAY_SUMMARY,
      { workspaceId: ws }
    )
      .then(setYesterday)
      .catch(() => {});
  }, [ws]);

  const toggleFavorite = () => {
    if (!currentProjectId || !currentTaskId) return;

    const existingIndex = favorites.findIndex((f) => f.taskId === currentTaskId);
    if (existingIndex > -1) {
      // Remove it
      const updated = favorites.filter((_, i) => i !== existingIndex);
      saveFavorites(updated);
    } else {
      // Add it
      const task = tasks.find((t) => t.id === currentTaskId);
      const project = projects.find((p) => p.id === currentProjectId);

      if (task && project) {
        if (favorites.length >= 3) {
          // Keep max 3 favorites
          saveFavorites([
            ...favorites.slice(1),
            {
              projectId: project.id,
              taskId: task.id,
              projectName: project.name,
              taskName: task.taskName,
              projectColor: project.color
            }
          ]);
        } else {
          saveFavorites([
            ...favorites,
            {
              projectId: project.id,
              taskId: task.id,
              projectName: project.name,
              taskName: task.taskName,
              projectColor: project.color
            }
          ]);
        }
      }
    }
  };

  const isCurrentFavorite = favorites.some((f) => f.taskId === currentTaskId);

  function formatHours(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  if (mode === "favorites") {
    return (
      <div className="w-full h-full select-none">
        {filteredFavorites.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No pinned tasks yet. Select a project and task in the Timer page first, then pin it.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredFavorites.map((f) => (
              <Button
                key={f.taskId}
                variant="outline"
                size="sm"
                className="w-full py-2 h-auto hover:bg-muted flex items-center justify-between text-xs px-3"
                onClick={() => onSelect(f.projectId, f.taskId)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ProjectColorDot color={f.projectColor} size="sm" className="shrink-0" />
                  <span className="font-semibold text-foreground truncate">{f.projectName}</span>
                </div>
                <span className="text-muted-foreground truncate ml-4 text-xs font-normal">
                  {f.taskName}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === "recents") {
    return (
      <div className="w-full h-full select-none">
        {filteredRecents.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No recent activity found in the last 7 days.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredRecents.map((r) => (
              <Button
                key={r.taskId}
                variant="outline"
                size="sm"
                className="w-full py-2 h-auto hover:bg-muted flex items-center justify-between text-xs px-3"
                onClick={() => onSelect(r.projectId, r.taskId)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ProjectColorDot color={r.projectColor} size="sm" className="shrink-0" />
                  <span className="font-semibold text-foreground truncate">{r.projectName}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 ml-4">
                  <span className="text-muted-foreground truncate text-xs font-normal">
                    {r.taskName}
                  </span>
                  {r.categoryName ? (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                      {r.categoryName}
                    </span>
                  ) : null}
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Yesterday Summary Strip */}
      {yesterday && yesterday.logCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
          <Clock className="size-4 shrink-0 text-primary" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs">
            <span className="font-semibold text-foreground">Yesterday</span>
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{formatHours(yesterday.totalSec)}</span>{" "}
              logged
            </span>
            {yesterday.billableSec > 0 && (
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="size-3 text-emerald-500" />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {Math.round((yesterday.billableSec / yesterday.totalSec) * 100)}% billable
                </span>
              </span>
            )}
            {yesterday.topTask && (
              <span className="text-muted-foreground truncate max-w-[180px]">
                Top: <span className="font-medium text-foreground">{yesterday.topTask}</span>
              </span>
            )}
          </div>
        </div>
      )}
      {/* Favorites & Recents Stack */}
      <div className="flex flex-col gap-4">
        {/* Favorites Card */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="size-4 text-yellow-500 fill-yellow-500" />
              <span>Pinned Favorites (Max 3)</span>
            </CardTitle>
            {currentProjectId && currentTaskId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleFavorite}
                title={isCurrentFavorite ? "Unpin current task" : "Pin current task"}
              >
                {isCurrentFavorite ? (
                  <PinOff className="size-4 text-primary" />
                ) : (
                  <Pin className="size-4 text-muted-foreground" />
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent className="py-2">
            {filteredFavorites.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No pinned tasks yet. Select a project and task above, then click the pin button.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredFavorites.map((f) => (
                  <Button
                    key={f.taskId}
                    variant="outline"
                    size="sm"
                    className="w-full py-2 h-auto hover:bg-muted flex items-center justify-between text-xs px-3"
                    onClick={() => onSelect(f.projectId, f.taskId)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ProjectColorDot color={f.projectColor} size="sm" className="shrink-0" />
                      <span className="font-semibold text-foreground truncate">
                        {f.projectName}
                      </span>
                    </div>
                    <span className="text-muted-foreground truncate ml-4 text-xs font-normal">
                      {f.taskName}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recents Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="size-4 text-blue-500" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            {filteredRecents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No recent activity found in the last 7 days.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredRecents.map((r) => (
                  <Button
                    key={r.taskId}
                    variant="outline"
                    size="sm"
                    className="w-full py-2 h-auto hover:bg-muted flex items-center justify-between text-xs px-3"
                    onClick={() => onSelect(r.projectId, r.taskId)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ProjectColorDot color={r.projectColor} size="sm" className="shrink-0" />
                      <span className="font-semibold text-foreground truncate">
                        {r.projectName}
                      </span>
                    </div>
                    <span className="text-muted-foreground truncate ml-4 text-xs font-normal">
                      {r.taskName}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* end grid */}
    </div>
  );
}
