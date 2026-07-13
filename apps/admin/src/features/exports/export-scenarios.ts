import type {
  ExportBodyDto,
  ExportGroupByDimension,
  ExportReportType,
  ExportSheetLayout
} from "@kloqra/contracts";
import {
  applyOrganizePreset,
  type ExportOrganizePreset,
  type ExportScenarioId
} from "@/lib/export-organize";

export type { ExportScenarioId };

export type ExportScenario = {
  id: ExportScenarioId;
  title: string;
  subtitle: string;
  purposeSlug: string;
  defaultOrganizePreset: ExportOrganizePreset;
  reportTypes: ExportReportType[];
  billable: ExportBodyDto["billable"];
  format: ExportBodyDto["format"];
  sheetLayout: ExportSheetLayout;
  groupBy: ExportGroupByDimension[];
  downloadLabel: string;
};

function scenarioFromPreset(
  base: Omit<ExportScenario, "sheetLayout" | "groupBy" | "defaultOrganizePreset"> & {
    defaultOrganizePreset: ExportOrganizePreset;
  }
): ExportScenario {
  const { sheetLayout, groupBy } = applyOrganizePreset(base.defaultOrganizePreset);
  return { ...base, sheetLayout, groupBy };
}

export const EXPORT_SCENARIOS: ExportScenario[] = [
  scenarioFromPreset({
    id: "payroll",
    title: "Payroll & timesheets",
    subtitle: "Hours per person, ready for payroll",
    purposeSlug: "payroll-timesheets",
    defaultOrganizePreset: "person_sheets_chronological",
    reportTypes: ["time_entries", "member_daily_total", "weekly_summary"],
    billable: "all",
    format: "xlsx",
    downloadLabel: "Download timesheets"
  }),
  scenarioFromPreset({
    id: "client_billing",
    title: "Client billing pack",
    subtitle: "Billable hours grouped by client",
    purposeSlug: "client-billing",
    defaultOrganizePreset: "client_sheets_chronological",
    reportTypes: ["time_entries", "by_client", "invoice"],
    billable: "billable",
    format: "xlsx",
    downloadLabel: "Download billing report"
  }),
  scenarioFromPreset({
    id: "project_review",
    title: "Project review",
    subtitle: "Hours and budget per project",
    purposeSlug: "project-review",
    defaultOrganizePreset: "project_sheets_chronological",
    reportTypes: ["time_entries", "by_project", "budget_vs_actual"],
    billable: "all",
    format: "xlsx",
    downloadLabel: "Download project review"
  }),
  scenarioFromPreset({
    id: "team_summary",
    title: "Team summary",
    subtitle: "Who worked how much this period",
    purposeSlug: "team-summary",
    defaultOrganizePreset: "summary_by_hours",
    reportTypes: ["by_member", "member_project_breakdown"],
    billable: "all",
    format: "xlsx",
    downloadLabel: "Download team summary"
  }),
  scenarioFromPreset({
    id: "missing_time",
    title: "Who hasn't logged time?",
    subtitle: "Find gaps before payroll closes",
    purposeSlug: "missing-time",
    defaultOrganizePreset: "summary_alphabetical",
    reportTypes: ["users_without_time", "missing_days"],
    billable: "all",
    format: "xlsx",
    downloadLabel: "Download missing time report"
  }),
  scenarioFromPreset({
    id: "capacity",
    title: "Team capacity",
    subtitle: "Who is over or under expected hours",
    purposeSlug: "team-capacity",
    defaultOrganizePreset: "one_file_by_person",
    reportTypes: ["overtime_summary", "utilization"],
    billable: "all",
    format: "xlsx",
    downloadLabel: "Download capacity report"
  }),
  scenarioFromPreset({
    id: "approval_status",
    title: "Timesheet approvals",
    subtitle: "Submission and approval status by person",
    purposeSlug: "timesheet-approvals",
    defaultOrganizePreset: "summary_alphabetical",
    reportTypes: ["timesheet_approval_status"],
    billable: "all",
    format: "xlsx",
    downloadLabel: "Download approval status"
  })
];

const COMMERCIAL_SCENARIO_IDS = new Set<ExportScenarioId>(["client_billing", "project_review"]);

export function getVisibleExportScenarios(commercialEnabled = true): ExportScenario[] {
  if (commercialEnabled) return EXPORT_SCENARIOS;
  return EXPORT_SCENARIOS.filter((s) => !COMMERCIAL_SCENARIO_IDS.has(s.id));
}

export function getExportScenario(id: ExportScenarioId): ExportScenario {
  const found = EXPORT_SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown export scenario: ${id}`);
  return found;
}
