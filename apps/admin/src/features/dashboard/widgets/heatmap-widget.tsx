"use client";

import { ROUTES } from "@chronomint/contracts";
import type { HeatmapResponseDto } from "@chronomint/contracts";
import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface HeatmapWidgetProps {
  from: string;
  to: string;
  projectId?: string;
  userId?: string;
  categoryId?: string;
  taskId?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS_LABELS = ["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm"];

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

export function HeatmapWidget({
  from,
  to,
  projectId,
  userId,
  categoryId,
  taskId
}: HeatmapWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [data, setData] = useState<HeatmapResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const params = rangeQuery(from, to, { projectId, userId, categoryId, taskId });
      const res = await api<HeatmapResponseDto>(`${ROUTES.REPORTING.HEATMAP}?${params}`, {
        workspaceId: ws
      });
      setData(res);
    } catch {
      setError("Failed to load time heatmap");
    } finally {
      setLoading(false);
    }
  }, [ws, from, to, projectId, userId, categoryId, taskId]);

  useEffect(() => {
    void fetchHeatmap();
  }, [fetchHeatmap]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
        Generating heatmap...
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

  // Map 24x7 matrix from slots array
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  data.slots.forEach((s) => {
    if (s.dayOfWeek >= 0 && s.dayOfWeek < 7 && s.hour >= 0 && s.hour < 24) {
      matrix[s.dayOfWeek][s.hour] = s.hours;
    }
  });

  // Calculate maximum value for relative scaling
  const maxHours = Math.max(...data.slots.map((s) => s.hours), 0.1);

  // Return background color based on density ratio
  function getCellBg(hours: number) {
    if (hours === 0) return "bg-muted/15 border-border/10";
    const ratio = hours / maxHours;
    if (ratio <= 0.2)
      return "bg-emerald-500/20 border-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    if (ratio <= 0.5)
      return "bg-emerald-500/40 border-emerald-500/20 text-emerald-900 dark:text-emerald-200";
    if (ratio <= 0.8) return "bg-emerald-500/70 border-emerald-500/30 text-white";
    return "bg-emerald-500 border-emerald-600 text-white";
  }

  return (
    <div className="flex flex-col h-full justify-between gap-4 py-1 select-none min-w-0">
      <div className="overflow-x-auto pb-1 scrollbar-thin">
        <div className="min-w-[550px] space-y-2">
          {/* Header Hour Labels */}
          <div className="flex text-[9px] text-muted-foreground font-mono font-medium pl-8 pr-1">
            {Array.from({ length: 24 }).map((_, hourIdx) => {
              const showLabel = hourIdx % 3 === 0;
              const label = showLabel ? HOURS_LABELS[hourIdx / 3] : "";
              return (
                <div key={hourIdx} className="flex-1 text-center shrink-0">
                  {label}
                </div>
              );
            })}
          </div>

          {/* 7 Days Grid */}
          <div className="space-y-1">
            {matrix.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-1.5 pr-1">
                {/* Day label */}
                <div className="w-7 text-[10px] text-muted-foreground font-semibold font-mono shrink-0">
                  {dayIdx % 2 === 1 ? DAYS[dayIdx] : ""}
                </div>

                {/* 24 Cells */}
                <div className="flex-1 flex gap-1">
                  {row.map((hours, hourIdx) => {
                    const formattedHours = hours.toFixed(1);
                    const title = `${DAYS[dayIdx]} ${hourIdx}:00 - ${hours > 0 ? formattedHours : 0} hrs`;
                    return (
                      <div
                        key={hourIdx}
                        title={title}
                        className={`flex-1 aspect-square rounded-[3px] border transition-all cursor-pointer hover:ring-1 hover:ring-primary ${getCellBg(hours)}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 text-[9px] text-muted-foreground font-mono font-medium">
        <span>Less</span>
        <div className="size-2.5 rounded-[2px] bg-muted/15 border border-border/10" />
        <div className="size-2.5 rounded-[2px] bg-emerald-500/20 border border-emerald-500/10" />
        <div className="size-2.5 rounded-[2px] bg-emerald-500/40 border border-emerald-500/20" />
        <div className="size-2.5 rounded-[2px] bg-emerald-500/70 border border-emerald-500/30" />
        <div className="size-2.5 rounded-[2px] bg-emerald-500 border border-emerald-600" />
        <span>More</span>
      </div>
    </div>
  );
}

export default HeatmapWidget;
