"use client";

import { ROUTES } from "@kloqra/contracts";
import type { MyWeekSummaryDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import React, { useEffect, useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart } from "recharts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const CHART_PALETTE = [
  "hsl(221 83% 53%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 67% 58%)",
  "hsl(0 84% 60%)",
  "hsl(187 85% 43%)",
  "hsl(215 16% 55%)"
];

export function CategorySplitWidget() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [summary, setSummary] = useState<MyWeekSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ws) return;
    setLoading(true);
    api<MyWeekSummaryDto>(ROUTES.REPORTING.ME, { workspaceId: ws })
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [ws]);

  const { chartData, totalHours, chartConfig } = useMemo(() => {
    const byCategory = summary?.byCategory ?? [];
    let total = 0;
    const config: ChartConfig = {};
    const data = byCategory.map((c, idx) => {
      const configKey = `cat_${idx}`;
      const color = CHART_PALETTE[idx % CHART_PALETTE.length];
      config[configKey] = { label: c.categoryName, color };
      total += c.totalHours;
      return {
        name: c.categoryName,
        value: c.totalHours,
        fill: color,
        configKey
      };
    });
    return {
      chartData: data,
      totalHours: Math.round(total * 10) / 10,
      chartConfig: config
    };
  }, [summary]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[200px] text-xs text-muted-foreground animate-pulse">
        Loading categories...
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center min-h-[200px]">
        <p className="text-xs text-muted-foreground text-center">No time logged this week</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center relative min-h-[200px] min-w-0">
      <div className="w-full flex-1 relative min-h-[140px]">
        <ChartContainer config={chartConfig} className="mx-auto h-full w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="65%"
              outerRadius="90%"
              strokeWidth={2}
              paddingAngle={1}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 9 }} />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center pb-3">
          <p className="text-xl font-bold tracking-tight">{totalHours}h</p>
          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
            This Week
          </p>
        </div>
      </div>
    </div>
  );
}

export default CategorySplitWidget;
