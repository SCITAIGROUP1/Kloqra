import { describe, expect, it } from "vitest";
import { applyOrganizePreset } from "./export-organize";
import { EXPORT_SCENARIOS, getExportScenario } from "@/features/exports/export-scenarios";

describe("export-scenarios", () => {
  it("defines all seven HR scenarios", () => {
    expect(EXPORT_SCENARIOS).toHaveLength(7);
    const ids = EXPORT_SCENARIOS.map((s) => s.id);
    expect(ids).toEqual([
      "payroll",
      "client_billing",
      "project_review",
      "team_summary",
      "missing_time",
      "capacity",
      "approval_status"
    ]);
  });

  it("each scenario sheetLayout and groupBy match its organize preset", () => {
    for (const scenario of EXPORT_SCENARIOS) {
      const expected = applyOrganizePreset(scenario.defaultOrganizePreset);
      expect(scenario.sheetLayout).toBe(expected.sheetLayout);
      expect(scenario.groupBy).toEqual(expected.groupBy);
    }
  });

  it("payroll scenario uses payroll purpose slug and timesheet reports", () => {
    const payroll = getExportScenario("payroll");
    expect(payroll.purposeSlug).toBe("payroll-timesheets");
    expect(payroll.reportTypes).toContain("time_entries");
    expect(payroll.reportTypes).toContain("member_daily_total");
    expect(payroll.sheetLayout).toBe("tabs_per_member");
  });

  it("client billing filters to billable only", () => {
    const billing = getExportScenario("client_billing");
    expect(billing.billable).toBe("billable");
    expect(billing.purposeSlug).toBe("client-billing");
    expect(billing.sheetLayout).toBe("tabs_per_client");
  });
});
