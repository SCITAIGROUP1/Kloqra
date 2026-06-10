import type { ExportGroupByDimension, ExportReportType } from "@kloqra/contracts";

type Row = Record<string, string | number>;
type KeyFn = (row: Row) => string;

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function buildSortKeys(report: ExportReportType, dimensions: ExportGroupByDimension[]): KeyFn[] {
  if (!dimensions.length) return [];

  const keys: KeyFn[] = [];
  const used = new Set<string>();

  const push = (field: string, fn: KeyFn) => {
    if (used.has(field)) return;
    used.add(field);
    keys.push(fn);
  };

  for (const dim of dimensions) {
    switch (dim) {
      case "project":
        if (
          report === "time_entries" ||
          report === "daily_summary" ||
          report === "weekly_summary" ||
          report === "by_task" ||
          report === "invoice" ||
          report === "by_project"
        ) {
          push("project", (r) => String(r.project ?? ""));
        }
        break;
      case "member":
        if (
          report === "time_entries" ||
          report === "daily_summary" ||
          report === "weekly_summary" ||
          report === "utilization" ||
          report === "by_member"
        ) {
          push("member", (r) => String(r.member ?? ""));
        }
        break;
      case "task":
        if (report === "time_entries") {
          if (!used.has("project")) {
            push("project", (r) => String(r.project ?? ""));
          }
          push("task", (r) => String(r.task ?? ""));
        } else if (report === "by_task") {
          push("task", (r) => String(r.task ?? ""));
          push("project", (r) => String(r.project ?? ""));
        }
        break;
      case "category":
        if (
          report === "time_entries" ||
          report === "by_task" ||
          report === "by_category" ||
          report === "invoice"
        ) {
          push("category", (r) => String(r.category ?? ""));
        }
        if (report === "by_category") {
          push("project", (r) => String(r.project ?? ""));
        }
        break;
      case "client":
        if (
          report === "time_entries" ||
          report === "daily_summary" ||
          report === "weekly_summary" ||
          report === "by_client"
        ) {
          push("client", (r) => String(r.client ?? ""));
        }
        break;
      case "day":
        push("date", (r) => String(r.date ?? r.week_start ?? ""));
        break;
      case "week":
        push("week_start", (r) => String(r.week_start ?? ""));
        break;
    }
  }

  if (report === "time_entries") {
    push("date", (r) => String(r.date ?? ""));
    push("start_time", (r) => String(r.start_time ?? ""));
  } else if (report === "daily_summary" && !used.has("date")) {
    push("date", (r) => String(r.date ?? ""));
  } else if (report === "weekly_summary" && !used.has("week_start")) {
    push("week_start", (r) => String(r.week_start ?? ""));
  }

  return keys;
}

export function sortRowsForGroupBy(
  rows: Row[],
  report: ExportReportType,
  groupBy: ExportGroupByDimension[]
): Row[] {
  const keys = buildSortKeys(report, groupBy);
  if (!keys.length) return rows;

  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const cmp = compareText(key(a), key(b));
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}
