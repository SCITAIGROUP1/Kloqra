import { describe, expect, it } from "vitest";
import {
  buildNotificationTemplate,
  formatTimesheetPeriodLabel,
  getIsoWeekNumber,
  parseNotificationTemplateId,
  parseNotificationType
} from "./notification-templates";

const UUID = "00000000-0000-4000-8000-000000000001";
const UUID_2 = "00000000-0000-4000-8000-000000000002";
const PERIOD_START = "2026-06-09T00:00:00.000Z";

const timesheetBase = {
  workspaceName: "Acme Corp",
  projectName: "Website Redesign",
  periodLabel: "Week 23",
  periodId: UUID,
  projectId: UUID_2,
  periodStart: PERIOD_START
};

describe("notification templates", () => {
  it("formats daily and monthly period labels", () => {
    const date = new Date("2026-06-09T12:00:00.000Z");
    expect(formatTimesheetPeriodLabel(date, "daily")).toContain("Jun");
    expect(formatTimesheetPeriodLabel(date, "monthly")).toContain("2026");
  });

  it("formats weekly period labels as Week N", () => {
    const label = formatTimesheetPeriodLabel(new Date("2026-06-09T12:00:00.000Z"), "weekly");
    expect(label).toMatch(/^Week \d+$/);
    expect(getIsoWeekNumber(new Date("2026-06-09T12:00:00.000Z"))).toBeGreaterThan(0);
  });

  it("parses template ids and notification types", () => {
    expect(parseNotificationTemplateId("timesheet.approved")).toBe("timesheet.approved");
    expect(parseNotificationTemplateId("timesheet.amendment.requested")).toBe(
      "timesheet.amendment.requested"
    );
    expect(parseNotificationType("APPROVAL_REQUEST")).toBe("APPROVAL_REQUEST");
  });

  it("rejects invalid notification template context", () => {
    expect(() =>
      buildNotificationTemplate("project.assigned", { projectName: "", projectId: UUID })
    ).toThrow(/Invalid context/);
  });

  it("renders project assigned template with and without inviter", () => {
    const withInviter = buildNotificationTemplate("project.assigned", {
      projectName: "Website Redesign",
      projectId: UUID,
      addedByName: "Alex Admin"
    });
    expect(withInviter.body).toContain("Alex Admin added you to");

    const withoutInviter = buildNotificationTemplate("project.assigned", {
      projectName: "Website Redesign",
      projectId: UUID
    });
    expect(withoutInviter.body).toContain("You were added to");
  });

  it("renders task assigned template", () => {
    const rendered = buildNotificationTemplate("task.assigned", {
      taskName: "Implement auth",
      projectName: "Website Redesign",
      taskId: UUID,
      projectId: UUID
    });
    expect(rendered.title).toBe("Task assigned");
    expect(rendered.metadata.taskId).toBe(UUID);
  });

  it("renders lifecycle templates for assignment changes", () => {
    const unassigned = buildNotificationTemplate("task.unassigned", {
      taskName: "Implement auth",
      projectName: "Website Redesign",
      taskId: UUID,
      projectId: UUID
    });
    expect(unassigned.title).toBe("Task unassigned");

    const removed = buildNotificationTemplate("workspace.removed", {
      workspaceName: "Acme Corp",
      actorName: "Alex Admin"
    });
    expect(removed.body).toContain("Alex Admin removed you");

    const digest = buildNotificationTemplate("timesheet.missing.digest", {
      workspaceName: "Acme Corp",
      missingCount: 3,
      periodLabel: "Week 23",
      periodStart: PERIOD_START
    });
    expect(digest.metadata.href).toContain("tab=missing");
  });

  it("renders timesheet approved template with submissions href", () => {
    const rendered = buildNotificationTemplate("timesheet.approved", {
      ...timesheetBase,
      reviewerName: "Alex Admin"
    });
    expect(rendered.title).toBe("Timesheet approved");
    expect(rendered.metadata.variant).toBe("success");
    expect(rendered.metadata.href).toContain("/submissions");
    expect(rendered.metadata.href).toContain(UUID_2);
    expect(rendered.emailSubject).toContain("Timesheet approved");
  });

  it("renders timesheet submitted template for admins with deep link", () => {
    const rendered = buildNotificationTemplate("timesheet.submitted", {
      submitterName: "Sam Rivera",
      ...timesheetBase,
      totalHours: 38.5
    });
    expect(rendered.preferenceKey).toBe("approvalRequest");
    expect(rendered.metadata.href).toContain("/approvals?tab=review");
    expect(rendered.metadata.href).toContain(`periodId=${UUID}`);
    expect(rendered.metadata.variant).toBe("attention");
    expect(rendered.metadata.details?.some((d) => d.label === "Workspace")).toBe(true);
  });

  it("renders batch timesheet submitted template", () => {
    const rendered = buildNotificationTemplate("timesheet.submitted.batch", {
      submitterName: "Sam Rivera",
      ...timesheetBase,
      cascadedCount: 3,
      cascadedPeriodLabels: ["Week 21", "Week 22", "Week 23"]
    });
    expect(rendered.title).toContain("batch");
    expect(rendered.metadata.href).toContain("batch=");
  });

  it("renders timesheet reminder template with project context", () => {
    const rendered = buildNotificationTemplate("timesheet.reminder", {
      workspaceName: "Acme Corp",
      projectName: "Website Redesign",
      projectId: UUID_2,
      periodLabel: "Week 23",
      dueLabel: "Friday, Jun 13",
      periodStart: PERIOD_START
    });
    expect(rendered.metadata.href).toContain("/submissions");
    expect(rendered.metadata.href).toContain(UUID_2);
    expect(rendered.body).toContain("Website Redesign");

    const manual = buildNotificationTemplate("timesheet.reminder.manual", {
      workspaceName: "Acme Corp",
      projectName: "Website Redesign",
      projectId: UUID_2,
      periodLabel: "Week 23",
      periodStart: PERIOD_START,
      adminMessage: "Please submit today"
    });
    expect(manual.metadata.href).toContain("highlight=remind");
    expect(manual.body).toContain("Please submit today");
  });

  it("renders timesheet rejected template with review note", () => {
    const rendered = buildNotificationTemplate("timesheet.rejected", {
      ...timesheetBase,
      reviewerName: "Alex Admin",
      reviewNote: "Missing Friday hours"
    });
    expect(rendered.metadata.variant).toBe("warning");
    expect(rendered.metadata.href).toContain("highlight=rejected");
    expect(rendered.body).toContain("Missing Friday hours");
  });

  it("renders timesheet approved and rejected templates with totalHours", () => {
    const approved = buildNotificationTemplate("timesheet.approved", {
      ...timesheetBase,
      totalHours: 37.5
    });
    expect(approved.body).toContain("37.5 hours");
    expect(approved.metadata.details).toContainEqual({ label: "Hours", value: "37.5 hours" });

    const rejected = buildNotificationTemplate("timesheet.rejected", {
      ...timesheetBase,
      totalHours: 37.5,
      reviewerName: "Alex Admin",
      reviewNote: "Incorrect logs"
    });
    expect(rejected.body).toContain("37.5 hours");
    expect(rejected.metadata.details).toContainEqual({ label: "Hours", value: "37.5 hours" });
  });

  it("renders amendment templates", () => {
    const requested = buildNotificationTemplate("timesheet.amendment.requested", {
      memberName: "Sam Rivera",
      workspaceName: "Acme Corp",
      projectName: "Website Redesign",
      periodLabel: "Week 23",
      periodId: UUID,
      projectId: UUID_2,
      amendmentId: UUID_2,
      reason: "Missing client meeting"
    });
    expect(requested.metadata.href).toContain("tab=amendments");

    const approved = buildNotificationTemplate("timesheet.amendment.approved", timesheetBase);
    expect(approved.metadata.href).toContain("amendment-approved");

    const denied = buildNotificationTemplate("timesheet.amendment.denied", {
      ...timesheetBase,
      adminNote: "Not approved"
    });
    expect(denied.body).toContain("Not approved");
  });

  it("renders timer auto-stopped template", () => {
    const rendered = buildNotificationTemplate("timer.autostopped", {
      hours: 14,
      taskName: "Implement auth",
      taskId: UUID
    });
    expect(rendered.body).toContain("Implement auth");
    expect(rendered.metadata.taskId).toBe(UUID);

    const withoutTask = buildNotificationTemplate("timer.autostopped", { hours: 8 });
    expect(withoutTask.body).not.toContain('"');
  });

  it("renders member and workspace templates", () => {
    const joined = buildNotificationTemplate("member.joined", {
      memberName: "Sam Rivera",
      workspaceName: "Acme",
      inviterName: "Alex Admin"
    });
    expect(joined.body).toContain("Invited by Alex Admin");

    const removed = buildNotificationTemplate("member.removed", {
      memberName: "Sam Rivera",
      workspaceName: "Acme",
      actorName: "Alex Admin"
    });
    expect(removed.body).toContain("Removed by Alex Admin");

    const workspace = buildNotificationTemplate("workspace.added", {
      workspaceName: "Acme"
    });
    expect(workspace.body).toContain("You have been added to Acme");
  });

  it("renders export and budget templates", () => {
    const ready = buildNotificationTemplate("export.ready", { scheduleName: "Weekly rollup" });
    expect(ready.metadata.variant).toBe("success");

    const failed = buildNotificationTemplate("export.failed", {
      scheduleName: "Weekly rollup",
      errorMessage: "SMTP timeout"
    });
    expect(failed.metadata.variant).toBe("warning");
    expect(failed.body).toContain("Weekly rollup");
    expect(failed.metadata.details?.some((d) => d.label === "Error")).toBe(true);

    const near = buildNotificationTemplate("budget.near", {
      projectName: "Website Redesign",
      projectId: UUID,
      percentUsed: 90,
      budgetHours: 100
    });
    expect(near.title).toBe("Budget threshold reached");

    const over = buildNotificationTemplate("budget.over", {
      projectName: "Website Redesign",
      projectId: UUID,
      percentUsed: 110,
      budgetHours: 100
    });
    expect(over.title).toBe("Budget exceeded");
  });

  it("renders jira sync template", () => {
    const rendered = buildNotificationTemplate("jira.synced", {
      projectName: "Website Redesign",
      syncSummary: "Synced 5 issues"
    });
    expect(rendered.body).toBe("Synced 5 issues");
    expect(rendered.metadata.details?.[0]?.value).toBe("Website Redesign");
  });
});
