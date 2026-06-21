import type { ExportGroupByDimension, ExportSheetLayout } from "@kloqra/contracts";

/** Dimensions tied to workbook tab splits (mutually exclusive as primary). */
export const LAYOUT_GROUP_BY_DIMS: ExportGroupByDimension[] = [
  "member",
  "project",
  "client",
  "category"
];

export function primaryGroupByForSheetLayout(
  layout: ExportSheetLayout
): ExportGroupByDimension | null {
  switch (layout) {
    case "tabs_per_member":
      return "member";
    case "tabs_per_project":
      return "project";
    case "tabs_per_client":
      return "client";
    case "tabs_per_category":
      return "category";
    default:
      return null;
  }
}

/** Row order when switching workbook layout: swap layout dimension, keep day/week/task. */
export function groupByForSheetLayout(
  layout: ExportSheetLayout,
  current: ExportGroupByDimension[]
): ExportGroupByDimension[] {
  const currentArr = Array.isArray(current) ? current : [];
  const layoutPrimary = primaryGroupByForSheetLayout(layout);

  if (!layoutPrimary) {
    return currentArr;
  }

  const extras = currentArr.filter((d) => d !== layoutPrimary && !LAYOUT_GROUP_BY_DIMS.includes(d));
  return [layoutPrimary, ...extras];
}

export const SHEET_LAYOUT_OPTIONS: {
  id: ExportSheetLayout;
  label: string;
  description: string;
  bestFor: string;
}[] = [
  {
    id: "standard",
    label: "Standard Workbook",
    description: "One tab per report type (Time entries, summaries, etc.).",
    bestFor: "Overview reports and finance exports."
  },
  {
    id: "tabs_per_member",
    label: "One Tab per Person",
    description: "Each team member gets their own tab for time-style reports.",
    bestFor: "Monthly timesheets you hand to each person or payroll."
  },
  {
    id: "tabs_per_project",
    label: "One Tab per Project",
    description: "Each project gets its own tab for time-style reports.",
    bestFor: "Client or project manager reviews."
  },
  {
    id: "tabs_per_client",
    label: "One Tab per Client",
    description: "Each client gets their own tab for time-style reports.",
    bestFor: "Agency billing packs by client."
  },
  {
    id: "tabs_per_category",
    label: "One Tab per Category",
    description: "Each work category gets its own tab for time-style reports.",
    bestFor: "Work-type breakdowns (meetings, dev, QA, etc.)."
  }
];

export function sheetLayoutRequiresTimeEntries(layout: ExportSheetLayout): boolean {
  return layout !== "standard";
}
