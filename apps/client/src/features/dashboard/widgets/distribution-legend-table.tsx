"use client";

import { ProjectColorDot } from "@kloqra/ui";
import type { ProjectDistributionRow } from "./project-split-data";

type DistributionLegendTableProps = {
  rows: ProjectDistributionRow[];
};

const LEGEND_GRID = "grid grid-cols-[minmax(0,1fr)_3.75rem_2.5rem] items-center gap-x-3 sm:gap-x-4";

function formatHours(hours: number): string {
  return `${hours}h`;
}

export function DistributionLegendTable({ rows }: DistributionLegendTableProps) {
  return (
    <div className="flex min-h-0 w-full min-w-[10rem] flex-1 flex-col justify-center overflow-y-auto">
      <div
        className={`${LEGEND_GRID} pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}
      >
        <span>Project</span>
        <span className="text-right">Hours</span>
        <span className="text-right">%</span>
      </div>

      <div className="divide-y divide-border/35">
        {rows.map((row) => (
          <div key={row.id} className={`${LEGEND_GRID} py-3 first:pt-1 sm:py-3.5`}>
            <div className="flex min-w-0 items-start gap-2 pr-1">
              <ProjectColorDot color={row.color} size="sm" className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium leading-snug text-foreground">
                  {row.projectName}
                </p>
                {row.clientName ? (
                  <p className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground">
                    {row.clientName}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-right text-xs tabular-nums text-foreground">
              {formatHours(row.hours)}
            </p>
            <p className="text-right text-xs tabular-nums text-foreground">{row.percentage}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
