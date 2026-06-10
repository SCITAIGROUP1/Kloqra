"use client";

import type { DashboardReportDto, ProjectDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { fetchListItems } from "@kloqra/web-shared";
import React, { useEffect, useState, useCallback } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer
} from "recharts";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface RateEfficiencyWidgetProps {
  report: DashboardReportDto;
}

interface ScatterDataPoint {
  name: string;
  hours: number;
  revenue: number;
  billablePct: number;
  color: string;
}

export function RateEfficiencyWidget({ report }: RateEfficiencyWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [dataPoints, setDataPoints] = useState<ScatterDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateEfficiency = useCallback(async () => {
    if (!ws || !report.timeByProject || report.timeByProject.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const projects = await fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, {
        workspaceId: ws
      }).catch(() => []);

      const points = report.timeByProject.map((p) => {
        const project = projects.find((pr) => pr.id === p.projectId);
        const color = project?.color ?? "#3b82f6";

        // Calculate billable percentage for this project
        const total = p.totalHours;
        const pct = total > 0 ? Math.round((p.billableHours / total) * 100) : 0;

        return {
          name: p.projectName,
          hours: Number(p.totalHours.toFixed(1)),
          revenue: Number(p.billableAmount.toFixed(0)),
          billablePct: pct,
          color
        };
      });

      setDataPoints(points);
    } catch (e) {
      console.error("Failed to calculate rate efficiency data", e);
    } finally {
      setLoading(false);
    }
  }, [ws, report.timeByProject]);

  useEffect(() => {
    void calculateEfficiency();
  }, [calculateEfficiency]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
        Calculating efficiency matrix...
      </div>
    );
  }

  if (dataPoints.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground py-6">
        No project data to display.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ScatterDataPoint;
      return (
        <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-popover-foreground text-xs space-y-1 z-50">
          <p className="font-bold flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name}
          </p>
          <p>
            <span className="text-muted-foreground">Logged:</span>{" "}
            <span className="font-mono font-semibold">{data.hours}h</span>
          </p>
          <p>
            <span className="text-muted-foreground">Revenue:</span>{" "}
            <span className="font-mono font-semibold">${data.revenue.toLocaleString()}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Billable Ratio:</span>{" "}
            <span className="font-mono font-semibold">{data.billablePct}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[220px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 15, right: 15, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis
            type="number"
            dataKey="hours"
            name="Hours"
            unit="h"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            type="number"
            dataKey="revenue"
            name="Revenue"
            unit="$"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <ZAxis
            type="number"
            dataKey="billablePct"
            range={[80, 450]}
            name="Billable Ratio"
            unit="%"
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "rgba(100, 100, 100, 0.2)", strokeWidth: 1 }}
          />
          <Scatter name="Projects" data={dataPoints}>
            {dataPoints.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RateEfficiencyWidget;
