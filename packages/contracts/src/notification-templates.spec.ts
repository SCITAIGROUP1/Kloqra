import { describe, expect, it } from "vitest";
import {
  buildNotificationTemplate,
  formatTimesheetPeriodLabel,
  getIsoWeekNumber
} from "./notification-templates";

const UUID = "00000000-0000-4000-8000-000000000001";

describe("notification templates", () => {
  it("formats weekly period labels as Week N", () => {
    const label = formatTimesheetPeriodLabel(new Date("2026-06-09T12:00:00.000Z"), "weekly");
    expect(label).toMatch(/^Week \d+$/);
    expect(getIsoWeekNumber(new Date("2026-06-09T12:00:00.000Z"))).toBeGreaterThan(0);
  });

  it("renders timesheet approved template with success variant", () => {
    const rendered = buildNotificationTemplate("timesheet.approved", {
      projectName: "Website Redesign",
      periodLabel: "Week 23",
      periodId: UUID,
      projectId: UUID,
      reviewerName: "Alex Admin"
    });
    expect(rendered.title).toBe("Timesheet approved");
    expect(rendered.metadata.variant).toBe("success");
    expect(rendered.metadata.ctaLabel).toBe("View timesheet");
    expect(rendered.emailSubject).toContain("Timesheet approved");
  });

  it("renders timesheet submitted template for admins", () => {
    const rendered = buildNotificationTemplate("timesheet.submitted", {
      submitterName: "Sam Rivera",
      projectName: "Website Redesign",
      periodLabel: "Week 23",
      periodId: UUID,
      projectId: UUID,
      totalHours: 38.5
    });
    expect(rendered.preferenceKey).toBe("approvalRequest");
    expect(rendered.metadata.href).toBe("/approvals");
    expect(rendered.metadata.variant).toBe("attention");
    expect(rendered.metadata.details?.some((d) => d.label === "Hours")).toBe(true);
  });

  it("renders timesheet reminder template with period metadata", () => {
    const rendered = buildNotificationTemplate("timesheet.reminder", {
      periodLabel: "Week 23",
      dueLabel: "Friday, Jun 13",
      periodStart: "2026-06-09T00:00:00.000Z"
    });
    expect(rendered.title).toBe("Submit your timesheet");
    expect(rendered.metadata.variant).toBe("attention");
    expect(rendered.metadata.periodStart).toBe("2026-06-09T00:00:00.000Z");
    expect(rendered.body).toContain("Friday, Jun 13");
  });

  it("renders export failed template with error detail", () => {
    const rendered = buildNotificationTemplate("export.failed", {
      scheduleName: "Weekly rollup",
      errorMessage: "SMTP timeout"
    });
    expect(rendered.metadata.variant).toBe("warning");
    expect(rendered.body).toContain("Weekly rollup");
    expect(rendered.metadata.details?.some((d) => d.label === "Error")).toBe(true);
  });
});
