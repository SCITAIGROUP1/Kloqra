"use client";

import { ROUTES } from "@chronomint/contracts";
import type { TaskBreakdownResponseDto } from "@chronomint/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@chronomint/ui/chart";
import React, { useEffect, useState, useCallback } from "react";
import { Cell, Legend, Pie, PieChart } from "recharts";
import { formatDurationClock } from "@/components/report-charts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface TaskBreakdownWidgetProps {
  from: string;
  to: string;
  projectId?: string;
  userId?: string;
  categoryId?: string;
  taskId?: string;
}

const CHART_PALETTE = [
  "hsl(221 83% 53%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 67% 58%)",
  "hsl(0 84% 60%)",
  "hsl(187 85% 43%)",
  "hsl(215 16% 55%)",
  "hsl(316 70% 50%)"
];

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

export function TaskBreakdownWidget({
  from,
  to,
  projectId,
  userId,
  categoryId,
  taskId
}: TaskBreakdownWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [data, setData] = useState<TaskBreakdownResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const params = rangeQuery(from, to, { projectId, userId, categoryId, taskId });
      const res = await api<TaskBreakdownResponseDto>(`${ROUTES.REPORTING.TASKS}?${params}`, {
        workspaceId: ws
      });
      setData(res);
    } catch {
      setError("Failed to load task breakdown");
    } finally {
      setLoading(false);
    }
  }, [ws, from, to, projectId, userId, categoryId, taskId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
        Aggregating tasks...
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

  if (data.tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground py-6">
        No task details logged.
      </div>
    );
  }

  const chartData = data.tasks.map((t, idx) => ({
    name: t.categoryName ? `${t.taskName} (${t.categoryName})` : t.taskName,
    value: t.totalHours,
    fill: CHART_PALETTE[idx % CHART_PALETTE.length]
  }));

  const totalHoursSum = data.tasks.reduce((sum, t) => sum + t.totalHours, 0);

  const chartConfig: ChartConfig = {};
  chartData.forEach((d) => {
    chartConfig[d.name] = { label: d.name, color: d.fill };
  });

  return (
    <div className="flex h-full flex-col justify-center relative min-h-[220px] min-w-0">
      <div className="w-full flex-1 relative min-h-[160px]">
        <ChartContainer config={chartConfig} className="mx-auto h-full w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="85%"
              strokeWidth={2}
              paddingAngle={1}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Legend
              wrapperStyle={{ fontSize: 9 }}
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center pb-8">
          <p className="text-xl font-bold tracking-tight">{formatDurationClock(totalHoursSum)}</p>
          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
            Logged
          </p>
        </div>
      </div>
    </div>
  );
}

export default TaskBreakdownWidget;
