import type { ExportBodyDto, ExportPreviewSheetDto, ExportSheetLayout } from "@kloqra/contracts";

function periodLabel(from: string, to: string) {
  return `${from.slice(0, 10)} – ${to.slice(0, 10)}`;
}

function layoutNoun(layout: ExportSheetLayout): string | null {
  switch (layout) {
    case "tabs_per_member":
      return "team member";
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

export function buildExportPreviewCopy(
  body: Pick<ExportBodyDto, "from" | "to" | "sheetLayout" | "reportTypes">,
  sheets: ExportPreviewSheetDto[],
  totalLogRows: number
): { headline: string; detail: string } {
  const period = periodLabel(body.from, body.to);
  const layout = body.sheetLayout ?? "standard";
  const tabCount = sheets.length;

  if (totalLogRows === 0 || tabCount === 0) {
    return {
      headline: "No time logged for this period",
      detail: `Nothing to export for ${period}. Try a wider date range or fewer filters.`
    };
  }

  const noun = layoutNoun(layout);
  const splitTabs = noun
    ? sheets.filter((s) => s.kind === "person" || s.kind === "project" || s.kind === "client")
    : [];
  const summaryTabs = sheets.filter((s) => s.kind === "report");

  if (noun && splitTabs.length > 0) {
    const names = splitTabs.map((s) => s.name);
    const shown = names.slice(0, 4);
    const more = names.length > 4 ? ` and ${names.length - 4} more` : "";
    const summaryPart =
      summaryTabs.length > 0
        ? ` Plus ${summaryTabs.length} summary tab${summaryTabs.length === 1 ? "" : "s"} (${summaryTabs.map((s) => s.name).join(", ")}).`
        : "";
    const orderNote =
      layout === "tabs_per_member"
        ? " Inside each tab, days run in order from the start of the period to the end."
        : layout === "tabs_per_project"
          ? " Inside each tab, rows stay grouped for that project."
          : " Inside each tab, rows stay grouped for that client.";

    return {
      headline: `${tabCount} tabs · ${totalLogRows.toLocaleString()} time entries · ${period}`,
      detail: `One tab per ${noun}: ${shown.join(", ")}${more}.${summaryPart}${orderNote}`
    };
  }

  const tabList = sheets.map((s) => `${s.name} (${s.rowCount.toLocaleString()} rows)`).join(" · ");

  return {
    headline: `${tabCount} tab${tabCount === 1 ? "" : "s"} · ${totalLogRows.toLocaleString()} time entries · ${period}`,
    detail: tabList || `Workbook covers ${period}.`
  };
}
