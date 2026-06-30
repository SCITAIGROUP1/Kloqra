import {
  deriveExportPurpose,
  formatExportDateRange,
  type ExportBodyDto,
  type ExportReportType,
  type MemberExportReportType
} from "@kloqra/contracts";

export type ExportSheetReport = ExportReportType | MemberExportReportType;

export type ExportXlsxTemplate = {
  tabShortName: string;
  summableColumns: string[];
  hoursColumns: string[];
  currencyColumns: string[];
  percentColumns: string[];
  columnWidths: Record<string, number>;
  supportsTotals: boolean;
};

const HOURS_COLS = [
  "hours",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "logged_hours",
  "budget_hours",
  "remaining_hours",
  "timer_hours",
  "manual_hours",
  "expected_hours",
  "over_hours",
  "under_hours"
] as const;

const CURRENCY_COLS = ["amount", "billable_amount", "rate"] as const;

const PERCENT_COLS = ["percent_used", "utilization_pct"] as const;

function hoursTemplate(
  tabShortName: string,
  summable: string[],
  extra: Partial<ExportXlsxTemplate> = {}
): ExportXlsxTemplate {
  return {
    tabShortName,
    summableColumns: summable,
    hoursColumns: [...HOURS_COLS],
    currencyColumns: [...CURRENCY_COLS],
    percentColumns: [...PERCENT_COLS],
    columnWidths: {
      workspace: 18,
      client: 16,
      project: 18,
      category: 14,
      task: 20,
      member: 16,
      email: 22,
      date: 12,
      start_time: 9,
      end_time: 9,
      hours: 10,
      description: 28,
      source: 10,
      billable: 10,
      rate: 10,
      amount: 12,
      total_hours: 12,
      billable_hours: 12,
      non_billable_hours: 14,
      billable_amount: 14
    },
    supportsTotals: summable.length > 0,
    ...extra
  };
}

export const EXPORT_XLSX_TEMPLATES: Record<ExportSheetReport, ExportXlsxTemplate> = {
  time_entries: hoursTemplate("Time entries", ["hours", "amount"]),
  invoice: hoursTemplate("Invoice", ["hours", "amount"]),
  daily_summary: hoursTemplate("Daily summary", [
    "total_hours",
    "billable_hours",
    "non_billable_hours",
    "billable_amount"
  ]),
  weekly_summary: hoursTemplate("Weekly summary", [
    "total_hours",
    "billable_hours",
    "non_billable_hours",
    "billable_amount"
  ]),
  by_project: hoursTemplate("By project", [
    "total_hours",
    "billable_hours",
    "non_billable_hours",
    "billable_amount"
  ]),
  by_member: hoursTemplate("By member", [
    "total_hours",
    "billable_hours",
    "non_billable_hours",
    "billable_amount"
  ]),
  by_client: hoursTemplate("By client", [
    "total_hours",
    "billable_hours",
    "non_billable_hours",
    "billable_amount"
  ]),
  by_task: hoursTemplate("By task", [
    "total_hours",
    "billable_hours",
    "non_billable_hours",
    "billable_amount"
  ]),
  by_category: hoursTemplate("By category", [
    "total_hours",
    "billable_hours",
    "non_billable_hours",
    "billable_amount"
  ]),
  users_without_time: hoursTemplate("No time logged", ["days_without_logs"], {
    supportsTotals: true
  }),
  budget_vs_actual: hoursTemplate("Budget vs actual", [
    "budget_hours",
    "logged_hours",
    "remaining_hours",
    "billable_amount"
  ]),
  utilization: hoursTemplate("Utilization", ["logged_hours", "expected_hours"]),
  member_daily_total: hoursTemplate("Daily totals", [
    "total_hours",
    "billable_hours",
    "non_billable_hours",
    "billable_amount"
  ]),
  member_project_breakdown: hoursTemplate("By person & project", [
    "total_hours",
    "billable_hours",
    "non_billable_hours",
    "billable_amount"
  ]),
  missing_days: hoursTemplate("Missing days", [], { supportsTotals: false }),
  overtime_summary: hoursTemplate("Over / under", [
    "logged_hours",
    "expected_hours",
    "over_hours",
    "under_hours"
  ]),
  hours_by_source: hoursTemplate("Timer vs manual", ["timer_hours", "manual_hours", "total_hours"]),
  timesheet_approval_status: hoursTemplate("Approvals", [], { supportsTotals: false })
};

const PURPOSE_TITLES: Record<string, string> = {
  "payroll-timesheets": "Payroll & timesheets",
  "client-billing": "Client billing pack",
  "project-review": "Project review",
  "team-summary": "Team summary",
  "missing-time": "Missing time report",
  "team-capacity": "Team capacity",
  "timesheet-approvals": "Timesheet approvals",
  "timesheets-by-person": "Timesheets by person",
  "by-project": "Hours by project",
  "by-client": "Hours by client",
  "by-category": "Hours by category",
  "time-entries": "Time entries",
  invoice: "Invoice"
};

/** Columns to omit per Quick-export purpose when the user did not pick custom columns. */
const PURPOSE_COLUMN_OMIT: Record<string, Partial<Record<ExportSheetReport, string[]>>> = {
  "payroll-timesheets": {
    time_entries: ["workspace", "source", "rate", "amount"]
  },
  "client-billing": {
    time_entries: ["workspace", "email", "source", "member"],
    invoice: ["category"]
  },
  "project-review": {
    time_entries: ["workspace", "email", "source"]
  },
  "team-summary": {
    by_member: ["email"],
    member_project_breakdown: ["email"]
  },
  "missing-time": {
    users_without_time: ["email"],
    missing_days: ["email"]
  },
  "team-capacity": {
    utilization: ["email"],
    overtime_summary: ["email"]
  },
  "timesheet-approvals": {
    timesheet_approval_status: ["email", "review_note"]
  }
};

export function getExportXlsxTemplate(report: ExportSheetReport): ExportXlsxTemplate {
  return EXPORT_XLSX_TEMPLATES[report] ?? hoursTemplate("Report", []);
}

export function purposeTitleFromSlug(slug: string): string {
  if (PURPOSE_TITLES[slug]) return PURPOSE_TITLES[slug]!;
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function buildSheetSubtitle(meta: {
  workspaceName: string;
  from: string;
  to: string;
  scopeHint?: string;
}): string {
  const period = formatExportDateRange(meta.from, meta.to);
  return [meta.workspaceName, period, meta.scopeHint].filter(Boolean).join(" · ");
}

export function applyPurposeColumnPreset(
  columnKeys: string[],
  report: ExportSheetReport,
  purposeSlug: string
): string[] {
  const omit = new Set(PURPOSE_COLUMN_OMIT[purposeSlug]?.[report] ?? []);
  if (omit.size === 0) return columnKeys;
  return columnKeys.filter((k) => !omit.has(k));
}

export function resolvePurposeSlug(body: ExportBodyDto): string {
  return deriveExportPurpose(body);
}

export function excelColumnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function findTotalLabelColumnIndex(
  columnKeys: string[],
  template: ExportXlsxTemplate
): number {
  const preferred = [
    "description",
    "member",
    "project",
    "client",
    "task",
    "category",
    "workspace",
    "date",
    "week_label",
    "period_label"
  ];
  for (const key of preferred) {
    const idx = columnKeys.indexOf(key);
    if (idx >= 0 && !template.summableColumns.includes(key)) return idx;
  }
  return columnKeys.findIndex((k) => !template.summableColumns.includes(k));
}

export function buildSplitSheetName(groupName: string, report: ExportSheetReport): string {
  const shortName = getExportXlsxTemplate(report).tabShortName;
  return `${groupName} — ${shortName}`;
}

export function sanitizeExcelTableName(base: string, index: number): string {
  const cleaned = base
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/^[^A-Za-z]+/, "")
    .slice(0, 20);
  const name = `Kq_${cleaned || "Export"}_${index}`;
  return name.slice(0, 255);
}

export type ExportXlsxTheme = {
  headerBg: string;
  headerFg: string;
  titleFg: string;
  subtitleFg: string;
  stripeBg: string;
  totalBg: string;
  tableTheme: "TableStyleLight1" | "TableStyleMedium2";
};

const DEFAULT_BRAND_HEX = "236BFE";

export function resolveExportXlsxTheme(brandColor?: string): ExportXlsxTheme {
  const hex = (brandColor ?? DEFAULT_BRAND_HEX).replace("#", "").toUpperCase();
  const valid = /^[0-9A-F]{6}$/.test(hex) ? hex : DEFAULT_BRAND_HEX;
  return {
    headerBg: `FF${valid}`,
    headerFg: "FFFFFFFF",
    titleFg: "FF0F172A",
    subtitleFg: "FF64748B",
    stripeBg: "FFF8FAFC",
    totalBg: "FFF1F5F9",
    tableTheme: "TableStyleMedium2"
  };
}

export function stripBuiltInTotalRow(
  report: ExportSheetReport,
  columnKeys: string[],
  lines: (string | number)[][]
): (string | number)[][] {
  if (report !== "invoice" || lines.length === 0) return lines;
  const descIdx = columnKeys.indexOf("description");
  if (descIdx < 0) return lines;
  const last = lines[lines.length - 1];
  if (last && String(last[descIdx] ?? "").toUpperCase() === "TOTAL") {
    return lines.slice(0, -1);
  }
  return lines;
}
