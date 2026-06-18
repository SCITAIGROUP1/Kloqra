"use client";

import {
  DEFAULT_EXPORT_COLUMNS,
  EXPORT_COLUMN_LABELS,
  type ExportReportType
} from "@kloqra/contracts";
import { Button, Label } from "@kloqra/ui";
import { useState } from "react";

const REPORT_LABELS: Record<ExportReportType, string> = {
  time_entries: "Time entries",
  invoice: "Invoice",
  daily_summary: "Daily summary",
  weekly_summary: "Weekly summary",
  member_daily_total: "Daily hours per person",
  by_project: "By project",
  by_member: "By member",
  by_client: "By client",
  by_task: "By task",
  by_category: "By category",
  member_project_breakdown: "Hours by person & project",
  users_without_time: "People with no time logged",
  missing_days: "Days with no time logged",
  budget_vs_actual: "Budget vs actual",
  utilization: "Utilization",
  overtime_summary: "Over / under hours",
  hours_by_source: "Timer vs manual entries",
  timesheet_approval_status: "Timesheet approval status"
};

type Props = {
  report: ExportReportType;
  selected: string[];
  onChange: (columns: string[]) => void;
};

export function ExportColumnPicker({ report, selected, onChange }: Props) {
  const allKeys = [...DEFAULT_EXPORT_COLUMNS[report]];
  const labels = EXPORT_COLUMN_LABELS[report];
  const selectedSet = new Set(selected);
  const unselected = allKeys.filter((k) => !selectedSet.has(k));
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function toggle(key: string, enable: boolean) {
    if (enable) {
      onChange([...selected, key]);
    } else if (selected.length > 1) {
      onChange(selected.filter((k) => k !== key));
    }
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= selected.length || to >= selected.length) {
      return;
    }
    const copy = [...selected];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item!);
    onChange(copy);
  }

  function move(key: string, dir: -1 | 1) {
    const idx = selected.indexOf(key);
    if (idx < 0) return;
    reorder(idx, idx + dir);
  }

  function reset() {
    onChange([...DEFAULT_EXPORT_COLUMNS[report]]);
  }

  return (
    <div className="min-w-0 p-1">
      <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">{REPORT_LABELS[report]} columns</Label>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          Reset columns
        </Button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground break-words">
        {selected.length} selected (export order): {selected.map((k) => labels[k]).join(" → ")}
      </p>

      <p className="mb-1 text-xs font-medium text-muted-foreground">Export order</p>
      <p className="mb-2 text-xs text-muted-foreground">Drag rows or use arrows to reorder.</p>
      <ul className="mb-4 space-y-1">
        {selected.map((key, index) => (
          <li
            key={key}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) reorder(dragIndex, index);
              setDragIndex(null);
            }}
            className={`flex min-w-0 cursor-grab items-center gap-2 rounded border border-transparent px-1 py-0.5 text-sm active:cursor-grabbing hover:bg-accent/50 ${
              dragIndex === index ? "border-primary/40 bg-accent/60" : ""
            }`}
          >
            <span className="select-none text-muted-foreground" title="Drag to reorder" aria-hidden>
              ⠿
            </span>
            <input
              type="checkbox"
              checked
              onChange={() => toggle(key, false)}
              className="h-4 w-4"
            />
            <span className="min-w-0 flex-1 truncate">
              <span className="text-muted-foreground">{index + 1}.</span> {labels[key]}
            </span>
            <span className="flex gap-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 px-0"
                disabled={index === 0}
                onClick={() => move(key, -1)}
                aria-label="Move up"
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 px-0"
                disabled={index === selected.length - 1}
                onClick={() => move(key, 1)}
                aria-label="Move down"
              >
                ↓
              </Button>
            </span>
          </li>
        ))}
      </ul>

      {unselected.length > 0 ? (
        <>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Available columns</p>
          <ul className="space-y-1">
            {unselected.map((key) => (
              <li
                key={key}
                className="flex items-center gap-2 rounded px-1 py-0.5 text-sm text-muted-foreground hover:bg-accent/30"
              >
                <span className="w-4" aria-hidden />
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggle(key, true)}
                  className="h-4 w-4"
                />
                <span className="flex-1">{labels[key]}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
