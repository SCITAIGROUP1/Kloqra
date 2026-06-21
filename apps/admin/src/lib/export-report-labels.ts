import type { ExportReportType } from "@kloqra/contracts";

export const EXPORT_REPORT_LABELS: Record<ExportReportType, string> = {
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

export function exportReportLabel(reportType: ExportReportType): string {
  return EXPORT_REPORT_LABELS[reportType] ?? reportType;
}
