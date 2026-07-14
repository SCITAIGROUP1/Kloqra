import { describe, expect, it } from "vitest";
import {
  jiraIssueSchema,
  jiraIssuesResponseSchema,
  updateJiraCredentialsSchema,
  verifyWorkspaceJiraSchema,
  verifyUserJiraSchema
} from "./dto/jira.dto";
import {
  platformNotificationSchema,
  PlatformNotificationType,
  platformNotificationTypeSchema
} from "./dto/platform-notification.dto";
import {
  changePlatformPasswordSchema,
  platformUserProfileSchema,
  updatePlatformUserProfileSchema
} from "./dto/platform-user-profile.dto";
import {
  assistantChatRequestSchema,
  assistantChatResponseSchema,
  changePasswordSchema,
  createCategorySchema,
  createTaskSchema,
  createWidgetShareSchema,
  taskListItemSchema,
  projectSummarySchema,
  createTimeLogSchema,
  formatUserDate,
  formatUserDateTime,
  listTimeLogOccupancyQuerySchema,
  listTimeLogsQuerySchema,
  loginSchema,
  inviteHandoffSchema,
  mergeUserPreferences,
  normalizeNotificationChannels,
  normalizeNotificationPreference,
  parseWorkspaceSettings,
  reportQuerySchema,
  refreshSessionSchema,
  resolveEffectiveDailyTargetHours,
  resolveEffectiveLanguage,
  resolveEffectiveNotifications,
  resolveEffectiveStartupPage,
  resolveEffectiveTheme,
  resolveEffectiveTimezone,
  resolveExportColumns,
  resolveMemberExportColumns,
  exportBodySchema,
  normalizeExportFiltersInput,
  resolveNotificationChannels,
  ROUTES,
  startTimerSchema,
  dashboardReportSchema,
  isShareableWidgetId,
  memberEmailDeliverySchema,
  bulkInviteMemberSchema,
  bulkInviteResponseSchema,
  bulkCategoryImportSchema,
  bulkCategoryImportResponseSchema,
  teamMembersOverviewSchema,
  timesheetSubmissionsQuerySchema,
  approveTimesheetSchema,
  rejectTimesheetSchema,
  reviewAmendmentSchema,
  updateCategorySchema,
  updateTimeLogSchema,
  timelogImportRowSchema,
  timelogImportResponseSchema,
  TIMELOG_IMPORT_COLUMN_LABELS,
  updateUserPreferencesSchema,
  userProfileSchema
} from "./index";

const UUID = "550e8400-e29b-41d4-a716-446655440000";
const UUID_2 = "550e8400-e29b-41d4-a716-446655440001";

describe("contracts", () => {
  it("validates login", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "secret" });
    expect(r.success).toBe(true);
  });

  it("validates invite handoff token", () => {
    const r = inviteHandoffSchema.safeParse({ inviteToken: "signed-jwt" });
    expect(r.success).toBe(true);
  });

  it("exposes public reporting routes", () => {
    expect(ROUTES.PUBLIC_REPORTING.DASHBOARD).toBe("/public/reporting/dashboard");
    expect(ROUTES.PUBLIC_REPORTING.UTILIZATION).toBe("/public/reporting/utilization");
    expect(ROUTES.PUBLIC_REPORTING.BUDGET(UUID)).toBe(`/public/reporting/projects/${UUID}/budget`);
    expect(ROUTES.PUBLIC_REPORTING.HEATMAP).toBe("/public/reporting/heatmap");
    expect(ROUTES.PUBLIC_REPORTING.CATEGORIES_HEATMAP).toBe("/public/reporting/categories-heatmap");
    expect(ROUTES.PUBLIC_REPORTING.TASKS).toBe("/public/reporting/tasks");
  });

  it("exposes reporting API key management routes", () => {
    expect(ROUTES.REPORTING_API_KEYS.LIST).toBe("/reporting-api-keys");
    expect(ROUTES.REPORTING_API_KEYS.CREATE).toBe("/reporting-api-keys");
    expect(ROUTES.REPORTING_API_KEYS.BY_ID(UUID)).toBe(`/reporting-api-keys/${UUID}`);
  });

  it("exposes timelog audit route", () => {
    expect(ROUTES.TIMELOGS.AUDIT_EVENTS("abc")).toBe("/timelogs/abc/audit-events");
  });

  it("exposes timelog occupancy route", () => {
    expect(ROUTES.TIMELOGS.OCCUPANCY).toBe("/timelogs/occupancy");
  });

  it("exposes timelog import routes", () => {
    expect(ROUTES.TIMELOGS.IMPORT).toBe("/timelogs/import");
    expect(ROUTES.TIMELOGS.IMPORT_TEMPLATE).toBe("/timelogs/import/template");
  });

  it("validates timelog import row and response schemas", () => {
    const row = timelogImportRowSchema.safeParse({
      project: "Acme",
      task: "Build",
      date: "2026-07-01",
      start_time: "09:00",
      end_time: "10:30",
      description: "Work",
      billable: "true"
    });
    expect(row.success).toBe(true);

    const bad = timelogImportRowSchema.safeParse({
      project: "Acme",
      task: "Build",
      date: "07/01/2026",
      start_time: "9am",
      end_time: "10:30"
    });
    expect(bad.success).toBe(false);

    const response = timelogImportResponseSchema.safeParse({
      created: 2,
      failed: [{ row: 3, reason: "Unknown task" }]
    });
    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.data.skipped).toBe(0);
    }

    expect(TIMELOG_IMPORT_COLUMN_LABELS.start_time).toBe("Start");
    expect(TIMELOG_IMPORT_COLUMN_LABELS.end_time).toBe("End");
  });

  it("exposes timesheet submissions route", () => {
    expect(ROUTES.TIMESHEETS.MY_SUBMISSIONS).toBe("/timesheets/submissions");
    expect(ROUTES.TIMESHEETS.SUBMIT_PREVIEW).toBe("/timesheets/submit-preview");
    expect(ROUTES.TIMESHEETS.LIST_MISSING).toBe("/timesheets/missing");
    expect(ROUTES.TIMESHEETS.LIST_APPROVED).toBe("/timesheets/approved");
    expect(ROUTES.TIMESHEETS.LIST_REJECTED).toBe("/timesheets/rejected");
    expect(ROUTES.TIMESHEETS.LIST_ALL).toBe("/timesheets/all");
    expect(ROUTES.TIMESHEETS.BULK_REVIEW).toBe("/timesheets/bulk-review");
    expect(ROUTES.TIMESHEETS.REMIND).toBe("/timesheets/remind");
    expect(ROUTES.TIMESHEETS.LIST_AMENDMENTS).toBe("/timesheets/amendments/pending");
    expect(ROUTES.TIMESHEETS.CREATE_AMENDMENT(UUID)).toBe(`/timesheets/${UUID}/amendments`);
  });

  it("validates timesheet submissions query with scope default", () => {
    const r = timesheetSubmissionsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.scope).toBe("logged");
    }
  });

  it("validates timesheet submissions query with assigned scope", () => {
    const r = timesheetSubmissionsQuerySchema.safeParse({ scope: "assigned" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.scope).toBe("assigned");
    }
  });

  it("validates timesheet submissions query lookbackWeeks default", () => {
    const r = timesheetSubmissionsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.lookbackWeeks).toBe(26);
    }
  });

  it("requires a review note when rejecting a timesheet", () => {
    expect(approveTimesheetSchema.safeParse({}).success).toBe(true);
    expect(rejectTimesheetSchema.safeParse({}).success).toBe(false);
    expect(rejectTimesheetSchema.safeParse({ reviewNote: "Missing task notes" }).success).toBe(
      true
    );
  });

  it("requires an admin note when denying an edit request", () => {
    expect(reviewAmendmentSchema.safeParse({}).success).toBe(false);
    expect(reviewAmendmentSchema.safeParse({ adminNote: "Not allowed" }).success).toBe(true);
  });

  it("exposes user profile routes", () => {
    expect(ROUTES.USERS.ME).toBe("/users/me");
    expect(ROUTES.USERS.PREFERENCES).toBe("/users/me/preferences");
    expect(ROUTES.USERS.DASHBOARD_LAYOUT).toBe("/users/me/dashboard-layout");
    expect(ROUTES.USERS.PASSWORD).toBe("/users/me/password");
    expect(ROUTES.USERS.SESSIONS).toBe("/users/me/sessions");
    expect(ROUTES.USERS.REVOKE_OTHER_SESSIONS).toBe("/users/me/sessions/revoke-others");
    expect(ROUTES.USERS.SESSION("abc")).toBe("/users/me/sessions/abc");
    expect(ROUTES.USERS.TWO_FA_ENABLE).toBe("/users/me/2fa/enable");
  });

  it("validates change password", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "old-secret",
      newPassword: "Secret123!"
    });
    expect(r.success).toBe(true);
  });

  it("validates user preferences partial update", () => {
    const r = updateUserPreferencesSchema.safeParse({
      dailyTargetHours: 6,
      theme: "dark",
      dateFormat: "DMY",
      timeFormat: "24h",
      notifications: { enabled: false },
      onboardingWizardDone: true,
      onboardingTourDone: false
    });
    expect(r.success).toBe(true);
  });

  it("clears saved timezone when browser default is selected", () => {
    const merged = mergeUserPreferences(
      { timezone: "America/New_York", dailyTargetHours: 8 },
      { timezone: null }
    );
    expect(merged.timezone).toBeUndefined();
    expect(resolveEffectiveTimezone(merged, "Asia/Colombo")).toBe("Asia/Colombo");
  });

  it("merges user notification preferences with defaults", () => {
    const merged = mergeUserPreferences(
      { notifications: { timesheetReminders: { inApp: false, email: true } } },
      {}
    );
    const notifications = resolveEffectiveNotifications(merged);
    expect(notifications.timesheetReminders.email).toBe(true);
    expect(notifications.timesheetReminders.inApp).toBe(false);
    expect(notifications.projectAssignment.email).toBe(false);
  });

  it("normalizes legacy notification channel objects to email booleans", () => {
    expect(normalizeNotificationPreference({ inApp: true, email: false }, false)).toBe(false);
    expect(normalizeNotificationPreference({ inApp: false, email: true }, false)).toBe(true);
    expect(normalizeNotificationPreference(true, false)).toBe(true);
  });

  it("normalizes partial notification channel objects with fallbacks", () => {
    expect(normalizeNotificationChannels({ email: true }, { inApp: false, email: false })).toEqual({
      inApp: false,
      email: true
    });
    expect(normalizeNotificationChannels("not-an-object", { inApp: true, email: false })).toEqual({
      inApp: true,
      email: false
    });
  });

  it("disables notification channels when notifications are turned off", () => {
    expect(
      resolveNotificationChannels({ notifications: { enabled: false } }, "approvalRequest")
    ).toEqual({ inApp: false, email: false });
  });

  it("parses workspace settings and falls back to empty object", () => {
    expect(parseWorkspaceSettings({ weekStart: "monday", expectedWeeklyHours: 35 })).toEqual({
      weekStart: "monday",
      expectedWeeklyHours: 35
    });
    expect(parseWorkspaceSettings({ logoUrl: "not-a-url" })).toEqual({});
  });

  it("formats user dates in supported preference formats", () => {
    const date = new Date("2026-06-12T13:45:00.000Z");
    expect(formatUserDate(date, "DMY", "UTC")).toMatch(/^\d{2}\/\d{2}\/2026$/);
    expect(formatUserDate(date, "YMD", "UTC")).toBe("2026-06-12");
  });

  it("resolves effective theme, language, and startup page defaults", () => {
    expect(resolveEffectiveTheme({})).toBe("system");
    expect(resolveEffectiveLanguage({})).toBe("en");
    expect(resolveEffectiveStartupPage({})).toBe("dashboard");
  });

  it("resolves export column defaults and overrides", () => {
    expect(resolveExportColumns("time_entries")).toContain("date");
    expect(resolveExportColumns("time_entries", { time_entries: ["date", "hours"] })).toEqual([
      "date",
      "hours"
    ]);
    expect(resolveExportColumns("member_daily_total")).toContain("total_hours");
    expect(resolveMemberExportColumns("time_entries")).toContain("date");
    expect(
      resolveMemberExportColumns("time_entries", { time_entries: ["date", "project"] })
    ).toEqual(["date", "project"]);
  });

  it("normalizes export scope filter arrays from legacy ids", () => {
    const normalized = normalizeExportFiltersInput({
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-30T23:59:59.000Z",
      projectId: "11111111-1111-4111-8111-111111111111"
    }) as Record<string, unknown>;
    expect(normalized.projectIds).toEqual(["11111111-1111-4111-8111-111111111111"]);

    const body = exportBodySchema.parse({
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-30T23:59:59.000Z",
      reportTypes: ["time_entries"],
      format: "xlsx",
      exportPurpose: "payroll-timesheets"
    });
    expect(body.exportPurpose).toBe("payroll-timesheets");
  });

  it("accepts json as an export format", () => {
    const body = exportBodySchema.parse({
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-30T23:59:59.000Z",
      reportTypes: ["time_entries"],
      format: "json"
    });
    expect(body.format).toBe("json");
  });

  it("exposes export job routes", () => {
    expect(ROUTES.EXPORT.JOBS).toBe("/export/jobs");
    expect(ROUTES.EXPORT.JOB("abc")).toBe("/export/jobs/abc");
    expect(ROUTES.EXPORT.JOB_DOWNLOAD("abc")).toBe("/export/jobs/abc/download");
  });

  it("validates timelog occupancy and update ranges", () => {
    expect(
      listTimeLogOccupancyQuerySchema.safeParse({
        from: "2025-01-02T10:00:00.000Z",
        to: "2025-01-02T09:00:00.000Z"
      }).success
    ).toBe(false);

    const update = updateTimeLogSchema.safeParse({
      startTime: "2025-01-02T10:00:00.000Z",
      endTime: "2025-01-02T11:00:00.000Z"
    });
    expect(update.success).toBe(true);
  });

  it("clears saved timezone when empty string is submitted", () => {
    const merged = mergeUserPreferences({ timezone: "America/New_York" }, { timezone: "" });
    expect(merged.timezone).toBeUndefined();
  });

  it("exposes notification routes and resolves dual-channel preferences", () => {
    expect(ROUTES.NOTIFICATIONS.LIST).toBe("/notifications");
    const resolved = resolveEffectiveNotifications({});
    expect(resolved.approvalRequest).toEqual({ inApp: true, email: true });
    expect(resolved.timesheetStatus.email).toBe(true);
  });

  it("formats user date time from preferences", () => {
    const formatted = formatUserDateTime(new Date("2026-06-12T13:45:00.000Z"), {
      timezone: "America/New_York",
      dateFormat: "MDY",
      timeFormat: "12h"
    });
    expect(formatted).toContain("06/12/2026");
    expect(formatted).toContain("•");
  });

  it("validates extended user profile shape", () => {
    const r = userProfileSchema.safeParse({
      email: "a@b.com",
      name: "Sam Rivera",
      firstName: "Sam",
      lastName: "Rivera",
      phone: null,
      location: null,
      jobTitle: null,
      department: null,
      workStartDate: null,
      defaultHourlyRate: 100,
      preferences: {},
      effectiveDailyTargetHours: 8,
      effectiveTimerStaleWarningHours: 8,
      effectiveTimezone: "UTC",
      effectiveDateFormat: "MDY",
      effectiveTimeFormat: "12h",
      effectiveTheme: "system",
      twoFactorEnabled: false,
      workContext: {
        organizationName: "Acme Corporation",
        workspaceName: "Acme Corporation",
        workspaceRole: "MEMBER"
      },
      activityStats: {
        totalHours: 10,
        projectCount: 2,
        memberSince: "2025-01-01T00:00:00.000Z"
      }
    });
    expect(r.success).toBe(true);
  });

  it("resolves effective daily target hours", () => {
    expect(resolveEffectiveDailyTargetHours({ dailyTargetHours: 6 }, 8)).toBe(6);
    expect(resolveEffectiveDailyTargetHours({}, 7)).toBe(7);
    expect(resolveEffectiveDailyTargetHours({}, undefined)).toBe(8);
  });

  it("resolves effective timezone from preference or browser default", () => {
    expect(resolveEffectiveTimezone({ timezone: "Asia/Colombo" }, "America/Los_Angeles")).toBe(
      "Asia/Colombo"
    );
    expect(resolveEffectiveTimezone({}, "Asia/Colombo")).toBe("Asia/Colombo");
    expect(resolveEffectiveTimezone({}, undefined)).toBe("UTC");
  });

  it("rejects timelog when end before start", () => {
    const r = createTimeLogSchema.safeParse({
      taskId: "550e8400-e29b-41d4-a716-446655440000",
      startTime: "2025-01-02T10:00:00.000Z",
      endTime: "2025-01-02T09:00:00.000Z"
    });
    expect(r.success).toBe(false);
  });

  it("validates timer start", () => {
    const r = startTimerSchema.safeParse({
      taskId: "550e8400-e29b-41d4-a716-446655440000"
    });
    expect(r.success).toBe(true);
  });

  it("rejects report query range over 366 days", () => {
    const r = reportQuerySchema.safeParse({
      from: "2024-01-01T00:00:00.000Z",
      to: "2025-06-01T00:00:00.000Z"
    });
    expect(r.success).toBe(false);
  });

  it("exposes categories routes", () => {
    expect(ROUTES.CATEGORIES.LIST).toBe("/categories");
    expect(ROUTES.CATEGORIES.BY_ID("abc")).toBe("/categories/abc");
    expect(ROUTES.CATEGORIES.BULK).toBe("/categories/bulk");
    expect(ROUTES.CATEGORIES.BULK_TEMPLATE).toBe("/categories/bulk/template");
    expect(ROUTES.CATEGORIES.BULK_UPLOAD).toBe("/categories/bulk/upload");
  });

  it("validates bulk category import schema", () => {
    const valid = bulkCategoryImportSchema.safeParse({
      categories: [{ name: "Development", description: "Engineering work" }]
    });
    expect(valid.success).toBe(true);

    const invalid = bulkCategoryImportSchema.safeParse({ categories: [] });
    expect(invalid.success).toBe(false);
  });

  it("validates bulk category import response schema", () => {
    const valid = bulkCategoryImportResponseSchema.safeParse({
      jobId: "job-123",
      status: "queued",
      enqueuedCount: 3
    });
    expect(valid.success).toBe(true);
  });

  it("exposes categories heatmap route", () => {
    expect(ROUTES.REPORTING.CATEGORIES_HEATMAP).toBe("/reporting/categories-heatmap");
  });

  it("accepts projectId and categoryId on timelog list query", () => {
    const r = listTimeLogsQuerySchema.safeParse({
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-01-31T23:59:59.000Z",
      projectId: UUID,
      categoryId: UUID_2,
      taskId: "550e8400-e29b-41d4-a716-446655440002",
      limit: 50,
      cursor: "550e8400-e29b-41d4-a716-446655440003"
    });
    expect(r.success).toBe(true);
  });

  it("accepts search and billableOnly on timelog list query", () => {
    const r = listTimeLogsQuerySchema.safeParse({
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-01-31T23:59:59.000Z",
      search: "reconciliation",
      billableOnly: "true"
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.search).toBe("reconciliation");
      expect(r.data.billableOnly).toBe(true);
    }
  });

  it("accepts categoryId on report query", () => {
    const r = reportQuerySchema.safeParse({
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-01-31T23:59:59.000Z",
      categoryId: UUID_2
    });
    expect(r.success).toBe(true);
  });

  it("accepts taskId on report query", () => {
    const r = reportQuerySchema.safeParse({
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-01-31T23:59:59.000Z",
      projectId: UUID,
      categoryId: UUID_2,
      taskId: "550e8400-e29b-41d4-a716-446655440002"
    });
    expect(r.success).toBe(true);
  });

  it("validates create category payload", () => {
    const r = createCategorySchema.safeParse({
      name: "Software Development",
      description: "Engineering & coding work"
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty category name", () => {
    const r = createCategorySchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  it("allows partial category update", () => {
    const r = updateCategorySchema.safeParse({ description: null });
    expect(r.success).toBe(true);
  });

  it("requires categoryId when creating a task", () => {
    const r = createTaskSchema.safeParse({
      projectId: UUID,
      taskName: "Implement feature"
    });
    expect(r.success).toBe(false);
  });

  it("accepts task with categoryId and assignees", () => {
    const r = createTaskSchema.safeParse({
      projectId: UUID,
      categoryId: UUID_2,
      taskName: "Implement feature",
      assigneeUserIds: [UUID]
    });
    expect(r.success).toBe(true);
  });

  it("keeps billableDefault on task list items but omits assignees", () => {
    const r = taskListItemSchema.safeParse({
      id: UUID,
      projectId: UUID_2,
      categoryId: UUID,
      taskName: "Implement feature",
      billableDefault: true,
      isCommon: true,
      isActive: true,
      assignees: [{ userId: UUID, userName: "Sam" }]
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("assignees");
      expect(r.data.billableDefault).toBe(true);
    }
  });

  it("exposes project summary and user project color routes", () => {
    expect(ROUTES.REPORTING.PROJECT_SUMMARY(UUID)).toBe(`/reporting/projects/${UUID}/summary`);
    expect(ROUTES.USERS.PROJECT_COLOR(UUID)).toBe(`/users/me/projects/${UUID}/color`);
  });

  it("exposes widget share routes", () => {
    expect(ROUTES.REPORTING.WIDGET_SHARES).toBe("/reporting/widget-shares");
    expect(ROUTES.REPORTING.WIDGET_SHARE("abc123")).toBe("/reporting/widget-share/abc123");
  });

  it("validates create widget share body", () => {
    const r = createWidgetShareSchema.safeParse({
      body: {
        widgetId: "distribution_donut",
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-01-31T23:59:59.000Z",
        options: { groupBy: "project" }
      },
      expiresInDays: 30
    });
    expect(r.success).toBe(true);
  });

  it("rejects blocked widget ids for share", () => {
    expect(isShareableWidgetId("distribution_donut")).toBe(true);
    expect(isShareableWidgetId("team_utilization")).toBe(true);
    expect(isShareableWidgetId("stat_total_hours")).toBe(false);
    expect(isShareableWidgetId("stat_billable")).toBe(false);
    expect(isShareableWidgetId("pending_timesheets")).toBe(false);
    expect(isShareableWidgetId("live_presence")).toBe(false);
  });

  it("validates project summary shape", () => {
    const r = projectSummarySchema.safeParse({
      projectId: UUID,
      projectName: "Acme",
      period: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-31T23:59:59.000Z" },
      totalHours: 10,
      billableHours: 8,
      nonBillableHours: 2,
      entryCount: 5,
      byTask: [],
      byCategory: [],
      byMember: []
    });
    expect(r.success).toBe(true);
  });

  it("exposes tenant organization routes", () => {
    expect(ROUTES.TENANTS.CURRENT).toBe("/tenants/current");
    expect(ROUTES.TENANTS.PUBLIC("kloqra-demo")).toBe("/tenants/public/kloqra-demo");
    expect(ROUTES.TENANTS.OVERVIEW).toBe("/tenants/current/overview");
    expect(ROUTES.TENANTS.MEMBERS).toBe("/tenants/current/members");
    expect(ROUTES.TENANTS.MEMBER("m-1")).toBe("/tenants/current/members/m-1");
    expect(ROUTES.TENANTS.WORKSPACES).toBe("/tenants/current/workspaces");
    expect(ROUTES.TENANTS.SUBSCRIPTION).toBe("/tenants/current/subscription");
    expect(ROUTES.TENANTS.DATA_EXPORT).toBe("/tenants/current/data-export");
    expect(ROUTES.TENANTS.DATA_EXPORT_JOB("job-1")).toBe("/tenants/current/data-export/job-1");
    expect(ROUTES.WORKSPACES.ASSIGN_ADMIN("ws-1")).toBe("/workspaces/ws-1/admins/assign");
  });

  it("exposes tenant workspace admin routes", () => {
    expect(ROUTES.TENANTS.WORKSPACE_ADMINS_OVERVIEW).toBe(
      "/tenants/current/workspace-admins/overview"
    );
    expect(ROUTES.TENANTS.WORKSPACE_MEMBER("ws-1", "m-1")).toBe(
      "/tenants/current/workspaces/ws-1/members/m-1"
    );
    expect(ROUTES.TENANTS.WORKSPACE_MEMBER_RESEND("ws-1", "m-1")).toBe(
      "/tenants/current/workspaces/ws-1/members/m-1/resend-credentials"
    );
  });

  it("exposes workspace members overview route", () => {
    expect(ROUTES.WORKSPACES.PROJECT_MANAGERS_OVERVIEW("ws-1")).toBe(
      "/workspaces/ws-1/project-managers/overview"
    );
    expect(ROUTES.WORKSPACES.MEMBERS_OVERVIEW("ws-1")).toBe("/workspaces/ws-1/members/overview");
    expect(ROUTES.WORKSPACES.MEMBER("ws-1", "m-1")).toBe("/workspaces/ws-1/members/m-1");
    expect(ROUTES.WORKSPACES.RESEND_CREDENTIALS("ws-1", "m-1")).toBe(
      "/workspaces/ws-1/members/m-1/resend-credentials"
    );
    expect(ROUTES.WORKSPACES.BULK_MEMBERS("ws-1")).toBe("/workspaces/ws-1/members/bulk");
    expect(ROUTES.WORKSPACES.BULK_MEMBERS_TEMPLATE("ws-1")).toBe(
      "/workspaces/ws-1/members/bulk/template"
    );
    expect(ROUTES.WORKSPACES.BULK_MEMBERS_UPLOAD("ws-1")).toBe(
      "/workspaces/ws-1/members/bulk/upload"
    );
  });

  it("validates bulk invite schema", () => {
    const valid = bulkInviteMemberSchema.safeParse({
      members: [
        { email: "john@example.com", name: "John Doe", role: "MEMBER" },
        { email: "admin@example.com", name: "Jane Admin", role: "ADMIN" }
      ]
    });
    expect(valid.success).toBe(true);

    const invalid = bulkInviteMemberSchema.safeParse({
      members: []
    });
    expect(invalid.success).toBe(false);
  });

  it("validates bulk invite response schema", () => {
    const valid = bulkInviteResponseSchema.safeParse({
      jobId: "job-123",
      status: "queued",
      enqueuedCount: 2
    });
    expect(valid.success).toBe(true);
  });

  it("validates team members overview shape", () => {
    const r = teamMembersOverviewSchema.safeParse({
      members: [
        {
          id: UUID,
          userId: UUID,
          userName: "Sam Rivera",
          userEmail: "sam@kloqra.dev",
          role: "ADMIN",
          isActive: true,
          status: "active",
          projectCount: 2,
          weekHours: 32.5,
          lastActiveAt: "2025-06-09T10:00:00.000Z",
          isTrackingNow: false
        }
      ],
      summary: {
        totalMembers: 1,
        activeMembers: 1,
        adminCount: 1,
        totalWeekHours: 32.5
      },
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1
    });
    expect(r.success).toBe(true);
  });

  it("validates dashboard report shape", () => {
    const r = dashboardReportSchema.safeParse({
      period: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-31T23:59:59.000Z" },
      workspace: {
        totalHours: 10,
        billableHours: 8,
        nonBillableHours: 2,
        totalAmount: 800,
        currency: "USD",
        activeProjects: 1,
        activeMembers: 2,
        billablePercent: 80
      },
      timeByProject: [],
      timeByUser: [],
      timeByCategory: [],
      weeklyHours: [],
      dailyHours: [],
      dailyByProject: []
    });
    expect(r.success).toBe(true);
  });

  it("validates dashboard report with non-USD currency", () => {
    const r = dashboardReportSchema.safeParse({
      period: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-31T23:59:59.000Z" },
      workspace: {
        totalHours: 10,
        billableHours: 8,
        nonBillableHours: 2,
        totalAmount: 800,
        currency: "EUR",
        activeProjects: 1,
        activeMembers: 2,
        billablePercent: 80
      },
      timeByProject: [],
      timeByUser: [],
      timeByCategory: [],
      weeklyHours: [],
      dailyHours: [],
      dailyByProject: []
    });
    expect(r.success).toBe(true);
  });

  it("validates member email delivery with failure detail", () => {
    const r = memberEmailDeliverySchema.safeParse({
      emailSent: false,
      emailSkipReason: "send_failed",
      emailFailureMessage: "Sender not verified"
    });
    expect(r.success).toBe(true);
  });

  it("exposes assistant chat route", () => {
    expect(ROUTES.ASSISTANT.CHAT).toBe("/assistant/chat");
  });

  it("exposes impersonation handoff routes", () => {
    expect(ROUTES.AUTH.IMPERSONATE).toBe("/auth/impersonate");
    expect(ROUTES.AUTH.IMPERSONATE_COMPLETE).toBe("/auth/impersonate/complete");
    expect(ROUTES.AUTH.SIGNUP).toBe("/auth/signup");
    expect(ROUTES.PLANS.PUBLIC).toBe("/plans/public");
    expect(ROUTES.PLANS.PRICING).toBe("/plans/pricing");
    expect(ROUTES.PLATFORM.OPS_SUMMARY).toBe("/platform/ops/summary");
    expect(ROUTES.PLATFORM.TENANT_EXTEND_TRIAL(UUID)).toBe(
      `/platform/tenants/${UUID}/extend-trial`
    );
  });

  it("validates refresh session body", () => {
    expect(refreshSessionSchema.safeParse({}).success).toBe(true);
    expect(refreshSessionSchema.safeParse({ refreshToken: "token" }).success).toBe(true);
  });

  it("validates assistant chat request and response shapes", () => {
    const req = assistantChatRequestSchema.safeParse({
      messages: [{ role: "user", content: "How do I start a timer?" }]
    });
    expect(req.success).toBe(true);

    const res = assistantChatResponseSchema.safeParse({
      reply: "Open the Timer page and choose a project and task.",
      links: [{ label: "Timer", href: "/timer" }]
    });
    expect(res.success).toBe(true);
  });

  it("exposes Jira routes", () => {
    expect(ROUTES.JIRA.MY_ISSUES).toBe("/jira/my-issues");
    expect(ROUTES.JIRA.CREDENTIALS).toBe("/jira/credentials");
    expect(ROUTES.JIRA.VERIFY).toBe("/jira/verify");
    expect(ROUTES.JIRA.VERIFY_USER).toBe("/jira/verify-user");
  });

  it("validates jiraIssueSchema", () => {
    const r = jiraIssueSchema.safeParse({ key: "PROJ-1", summary: "Fix bug" });
    expect(r.success).toBe(true);
  });

  it("validates jiraIssuesResponseSchema with connected true", () => {
    const r = jiraIssuesResponseSchema.safeParse({
      connected: true,
      issues: [{ key: "PROJ-1", summary: "Fix bug", statusCategory: "In Progress" }]
    });
    expect(r.success).toBe(true);
  });

  it("validates jiraIssuesResponseSchema with connected false and empty issues", () => {
    const r = jiraIssuesResponseSchema.safeParse({ connected: false, issues: [] });
    expect(r.success).toBe(true);
  });

  it("validates updateJiraCredentialsSchema with email", () => {
    const r = updateJiraCredentialsSchema.safeParse({ jiraEmail: "alice@acme.com" });
    expect(r.success).toBe(true);
  });

  it("validates updateJiraCredentialsSchema with null (unlink)", () => {
    const r = updateJiraCredentialsSchema.safeParse({ jiraEmail: null });
    expect(r.success).toBe(true);
  });

  it("rejects updateJiraCredentialsSchema with invalid email", () => {
    const r = updateJiraCredentialsSchema.safeParse({ jiraEmail: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("validates verifyWorkspaceJiraSchema", () => {
    const r = verifyWorkspaceJiraSchema.safeParse({
      jiraSiteUrl: "https://acme.atlassian.net",
      jiraServiceEmail: "bot@acme.com",
      jiraServiceToken: "ATATT3xtoken"
    });
    expect(r.success).toBe(true);
  });

  it("validates verifyWorkspaceJiraSchema without token (optional)", () => {
    const r = verifyWorkspaceJiraSchema.safeParse({
      jiraSiteUrl: "https://acme.atlassian.net",
      jiraServiceEmail: "bot@acme.com"
    });
    expect(r.success).toBe(true);
  });

  it("rejects verifyWorkspaceJiraSchema with invalid URL", () => {
    const r = verifyWorkspaceJiraSchema.safeParse({
      jiraSiteUrl: "not-a-url",
      jiraServiceEmail: "bot@acme.com"
    });
    expect(r.success).toBe(false);
  });

  it("validates verifyUserJiraSchema", () => {
    const r = verifyUserJiraSchema.safeParse({ jiraEmail: "alice@acme.com" });
    expect(r.success).toBe(true);
  });

  it("rejects verifyUserJiraSchema with non-email", () => {
    const r = verifyUserJiraSchema.safeParse({ jiraEmail: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("exposes platform account and notification routes", () => {
    expect(ROUTES.PLATFORM.ME).toBe("/platform/me");
    expect(ROUTES.PLATFORM.ME_PREFERENCES).toBe("/platform/me/preferences");
    expect(ROUTES.PLATFORM.ME_PASSWORD).toBe("/platform/me/password");
    expect(ROUTES.PLATFORM.ME_SESSIONS).toBe("/platform/me/sessions");
    expect(ROUTES.PLATFORM.ME_2FA_ENABLE).toBe("/platform/me/2fa/enable");
    expect(ROUTES.PLATFORM.ME_2FA_VERIFY).toBe("/platform/me/2fa/verify");
    expect(ROUTES.PLATFORM.ME_2FA_DISABLE).toBe("/platform/me/2fa/disable");
    expect(ROUTES.AUTH.PLATFORM_COMPLETE_2FA_SETUP).toBe("/auth/platform/complete-2fa-setup");
    expect(ROUTES.AUTH.PLATFORM_2FA_SETUP_ENABLE).toBe("/auth/platform/2fa-setup/enable");
    expect(ROUTES.PLATFORM.NOTIFICATIONS).toBe("/platform/notifications");
    expect(ROUTES.PLATFORM.NOTIFICATIONS_UNREAD_COUNT).toBe("/platform/notifications/unread-count");
    expect(ROUTES.PLATFORM.NOTIFICATION(UUID)).toBe(`/platform/notifications/${UUID}`);
  });

  it("validates platform user profile", () => {
    const r = platformUserProfileSchema.safeParse({
      id: UUID,
      email: "platform@kloqra.dev",
      name: "Platform Admin",
      platformRole: "SUPERADMIN",
      preferences: {},
      effectiveTheme: "system",
      twoFactorEnabled: false
    });
    expect(r.success).toBe(true);
  });

  it("validates update platform user profile requires a field", () => {
    expect(updatePlatformUserProfileSchema.safeParse({}).success).toBe(false);
    expect(updatePlatformUserProfileSchema.safeParse({ name: "Ops" }).success).toBe(true);
  });

  it("validates platform notification types", () => {
    expect(platformNotificationTypeSchema.parse("TENANT_CREATED")).toBe(
      PlatformNotificationType.TENANT_CREATED
    );
    const r = platformNotificationSchema.safeParse({
      id: UUID,
      type: PlatformNotificationType.QUEUE_FAILURE,
      title: "Queue failures",
      body: "Export queue has 5 failed jobs",
      readAt: null,
      createdAt: "2024-01-01T00:00:00.000Z"
    });
    expect(r.success).toBe(true);
  });

  it("validates change platform password", () => {
    const r = changePlatformPasswordSchema.safeParse({
      currentPassword: "password123",
      newPassword: "Password123!"
    });
    expect(r.success).toBe(true);
  });
});
