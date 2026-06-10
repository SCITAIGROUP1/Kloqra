import type { ExportGroupByDimension, ExportReportType } from "@kloqra/contracts";

export const GROUP_BY_DIMENSION_OPTIONS: {
  id: ExportGroupByDimension;
  label: string;
  shortHint: string;
}[] = [
  {
    id: "project",
    label: "Project",
    shortHint: "Adds a by-project totals sheet."
  },
  {
    id: "member",
    label: "Member",
    shortHint:
      "Time entries run day-by-day for one member, then the next (good for month reports). Adds a by-member totals sheet."
  },
  {
    id: "task",
    label: "Task",
    shortHint: "Adds a by-task totals sheet."
  },
  {
    id: "category",
    label: "Category",
    shortHint: "Adds a by-category totals sheet."
  },
  {
    id: "client",
    label: "Client",
    shortHint: "Adds a by-client totals sheet."
  },
  {
    id: "day",
    label: "Day",
    shortHint: "Adds a daily summary sheet."
  },
  {
    id: "week",
    label: "Week",
    shortHint: "Adds a weekly summary sheet."
  }
];

const ROLLUP_BY_DIMENSION: Partial<Record<ExportGroupByDimension, ExportReportType>> = {
  project: "by_project",
  member: "by_member",
  task: "by_task",
  category: "by_category",
  client: "by_client",
  day: "daily_summary",
  week: "weekly_summary"
};

export function reportsForGroupBy(dimensions: ExportGroupByDimension[]): ExportReportType[] {
  if (!Array.isArray(dimensions) || !dimensions.length) return [];

  const sheets: ExportReportType[] = ["time_entries"];
  for (const dim of dimensions) {
    const rollup = ROLLUP_BY_DIMENSION[dim];
    if (rollup && !sheets.includes(rollup)) sheets.push(rollup);
  }
  return sheets;
}

export function groupBySummaryLabel(dimensions: ExportGroupByDimension[]): string | null {
  if (!dimensions.length) return null;
  return dimensions
    .map((d) => GROUP_BY_DIMENSION_OPTIONS.find((o) => o.id === d)?.label ?? d)
    .join(" → ");
}

export function groupByCombinationHint(dimensions: ExportGroupByDimension[]): string {
  if (!dimensions.length) {
    return "Select one or more dimensions in order. Leave all off to pick report sheets manually.";
  }
  if (dimensions.length === 1) {
    const opt = GROUP_BY_DIMENSION_OPTIONS.find((o) => o.id === dimensions[0]);
    if (dimensions[0] === "member") {
      return "Each member’s time entries appear together, earliest day first within that member, then the next member.";
    }
    return `Sort rows by ${opt?.label ?? dimensions[0]}. ${opt?.shortHint ?? ""}`.trim();
  }
  const order = groupBySummaryLabel(dimensions);
  const rollups = dimensions
    .map((d) => ROLLUP_BY_DIMENSION[d])
    .filter((r): r is ExportReportType => Boolean(r))
    .map((r) => r.replace("by_", "by ").replace("_", " "));
  const uniqueRollups = [...new Set(rollups)];
  return `Sort rows in order: ${order}. Includes ${uniqueRollups.join(", ")} rollup sheets.`;
}

export function moveGroupByDimension(
  dimensions: ExportGroupByDimension[],
  index: number,
  direction: -1 | 1
): ExportGroupByDimension[] {
  if (!Array.isArray(dimensions)) return [];
  const next = index + direction;
  if (next < 0 || next >= dimensions.length) return dimensions;
  const copy = [...dimensions];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item!);
  return copy;
}

/** Normalize legacy preset bodies that stored a single string. */
export function normalizeGroupByFromBody(
  groupBy: ExportGroupByDimension[] | string | undefined
): ExportGroupByDimension[] {
  if (groupBy == null || groupBy === "none") return [];
  if (typeof groupBy === "string") {
    const found = GROUP_BY_DIMENSION_OPTIONS.find((o) => o.id === groupBy);
    return found ? [found.id] : [];
  }
  return Array.isArray(groupBy) ? groupBy : [];
}
