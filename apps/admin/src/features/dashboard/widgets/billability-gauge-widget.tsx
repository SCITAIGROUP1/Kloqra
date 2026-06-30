"use client";

import type { DashboardReportDto } from "@kloqra/contracts";
import React from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

export type BillabilityGaugeWidgetProps = {
  report: DashboardReportDto;
};

export function BillabilityGaugeWidget({ report }: BillabilityGaugeWidgetProps) {
  const pct = report.workspace.billablePercent;

  // Color coding: Green >= 80%, Amber 50-79%, Red < 50%
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  const data = [
    {
      name: "Billable",
      value: pct,
      fill: color
    }
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center relative min-h-0 min-w-0">
      <div className="w-full flex-1 min-h-[140px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="75%"
            outerRadius="100%"
            barSize={12}
            data={data}
            startAngle={90}
            endAngle={90 - (pct / 100) * 360}
          >
            <RadialBar
              background={{ fill: "rgba(120, 120, 120, 0.1)" }}
              dataKey="value"
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-3xl font-bold tracking-tight">{pct}%</span>
          <span className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground mt-0.5">
            Billable
          </span>
        </div>
      </div>
    </div>
  );
}
export default BillabilityGaugeWidget;
