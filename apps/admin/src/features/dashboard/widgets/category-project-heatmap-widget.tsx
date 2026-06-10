"use client";

import { ROUTES } from "@kloqra/contracts";
import type { CategoryProjectHeatmapResponseDto } from "@kloqra/contracts";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface CategoryProjectHeatmapWidgetProps {
  from: string;
  to: string;
  projectId?: string;
  userId?: string;
  categoryId?: string;
  taskId?: string;
}

function rangeQuery(
  start: string,
  end: string,
  filters?: { projectId?: string; userId?: string; categoryId?: string; taskId?: string }
) {
  const from = new Date(start + "T00:00:00");
  const to = new Date(end + "T23:59:59.999");
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString()
  });
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.userId) params.set("userId", filters.userId);
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.taskId) params.set("taskId", filters.taskId);
  return params;
}

export function CategoryProjectHeatmapWidget({
  from,
  to,
  projectId,
  userId,
  categoryId,
  taskId
}: CategoryProjectHeatmapWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [data, setData] = useState<CategoryProjectHeatmapResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const params = rangeQuery(from, to, { projectId, userId, categoryId, taskId });
      const res = await api<CategoryProjectHeatmapResponseDto>(
        `${ROUTES.REPORTING.CATEGORIES_HEATMAP}?${params}`,
        { workspaceId: ws }
      );
      setData(res);
    } catch {
      setError("Failed to load category heatmap");
    } finally {
      setLoading(false);
    }
  }, [ws, from, to, projectId, userId, categoryId, taskId]);

  useEffect(() => {
    void fetchHeatmap();
  }, [fetchHeatmap]);

  const { matrix, maxHours } = useMemo(() => {
    if (!data) return { matrix: [] as number[][], maxHours: 0 };
    const rows = data.categories.length;
    const cols = data.projects.length;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    let max = 0;
    for (const cell of data.cells) {
      const row = data.categories.findIndex((c) => c.categoryId === cell.categoryId);
      const col = data.projects.findIndex((p) => p.projectId === cell.projectId);
      if (row >= 0 && col >= 0) {
        grid[row][col] = cell.hours;
        max = Math.max(max, cell.hours);
      }
    }
    return { matrix: grid, maxHours: max };
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
        Building category matrix...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive font-medium py-6">
        {error || "No data"}
      </div>
    );
  }

  if (data.cells.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground py-6">
        No category hours in this period.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-1 min-h-[200px]">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `120px repeat(${data.projects.length}, minmax(64px, 1fr))` }}
      >
        <div />
        {data.projects.map((p) => (
          <div
            key={p.projectId}
            className="text-[9px] font-semibold text-muted-foreground truncate text-center px-1"
            title={p.projectName}
          >
            {p.projectName}
          </div>
        ))}
        {data.categories.map((cat, rowIdx) => (
          <React.Fragment key={cat.categoryId}>
            <div
              className="text-[10px] font-medium text-foreground truncate pr-2 flex items-center"
              title={cat.categoryName}
            >
              {cat.categoryName}
            </div>
            {data.projects.map((proj, colIdx) => {
              const hours = matrix[rowIdx]?.[colIdx] ?? 0;
              const intensity = maxHours > 0 ? hours / maxHours : 0;
              return (
                <div
                  key={`${cat.categoryId}-${proj.projectId}`}
                  className="rounded-sm border border-border/40 flex items-center justify-center text-[9px] font-mono tabular-nums min-h-[28px]"
                  style={{
                    backgroundColor: `hsl(221 83% 53% / ${0.08 + intensity * 0.72})`
                  }}
                  title={`${cat.categoryName} × ${proj.projectName}: ${hours.toFixed(2)}h`}
                >
                  {hours > 0 ? hours.toFixed(1) : ""}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default CategoryProjectHeatmapWidget;
