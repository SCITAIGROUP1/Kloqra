import type {
  ExportGroupByDimension,
  ExportReportType,
  ExportSheetLayout
} from "@kloqra/contracts";

type Row = Record<string, string | number>;

const SPLITTABLE_REPORTS: ExportReportType[] = [
  "time_entries",
  "daily_summary",
  "weekly_summary",
  "invoice",
  "member_daily_total",
  "member_project_breakdown",
  "missing_days"
];

export function splitFieldForLayout(
  layout: ExportSheetLayout,
  report: ExportReportType
): "member" | "project" | "client" | "category" | null {
  if (layout === "standard" || !SPLITTABLE_REPORTS.includes(report)) return null;
  if (layout === "tabs_per_member") return "member";
  if (layout === "tabs_per_project") return "project";
  if (layout === "tabs_per_client") return "client";
  if (layout === "tabs_per_category") return "category";
  return null;
}

export function groupRowsByField(
  rows: Row[],
  field: "member" | "project" | "client" | "category"
): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = String(row[field] ?? "").trim() || "—";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return new Map(
    [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  );
}

export function innerGroupByForSplit(
  groupBy: ExportGroupByDimension[],
  splitField: "member" | "project" | "client" | "category"
): ExportGroupByDimension[] {
  const drop: ExportGroupByDimension =
    splitField === "member"
      ? "member"
      : splitField === "project"
        ? "project"
        : splitField === "client"
          ? "client"
          : "category";
  const inner = groupBy.filter((d) => d !== drop);
  return inner.length > 0 ? inner : ["day"];
}

export function sanitizeExcelSheetName(raw: string): string {
  const cleaned = raw
    .replace(/[\\/*?:[\]]/g, " ")
    .trim()
    .slice(0, 31);
  return cleaned || "Sheet";
}

export function allocateSheetName(base: string, used: Set<string>): string {
  let candidate = sanitizeExcelSheetName(base);
  let n = 2;
  while (used.has(candidate)) {
    const suffix = ` (${n++})`;
    candidate = sanitizeExcelSheetName(base).slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate);
  return candidate;
}

export function previewSheetKind(
  layout: ExportSheetLayout,
  splitField: "member" | "project" | "client" | "category" | null
): "person" | "project" | "client" | "category" | "report" {
  if (!splitField) return "report";
  if (splitField === "member") return "person";
  if (splitField === "project") return "project";
  if (splitField === "client") return "client";
  return "category";
}
