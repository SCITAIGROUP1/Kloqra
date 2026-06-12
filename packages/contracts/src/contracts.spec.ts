import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  createCategorySchema,
  createTaskSchema,
  projectSummarySchema,
  createTimeLogSchema,
  formatUserDateTime,
  listTimeLogsQuerySchema,
  loginSchema,
  mergeUserPreferences,
  normalizeNotificationPreference,
  reportQuerySchema,
  resolveEffectiveDailyTargetHours,
  resolveEffectiveNotifications,
  resolveEffectiveTimezone,
  ROUTES,
  startTimerSchema,
  dashboardReportSchema,
  teamMembersOverviewSchema,
  timesheetSubmissionsQuerySchema,
  updateCategorySchema,
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

  it("exposes timelog audit route", () => {
    expect(ROUTES.TIMELOGS.AUDIT_EVENTS("abc")).toBe("/timelogs/abc/audit-events");
  });

  it("exposes timelog occupancy route", () => {
    expect(ROUTES.TIMELOGS.OCCUPANCY).toBe("/timelogs/occupancy");
  });

  it("exposes timesheet submissions route", () => {
    expect(ROUTES.TIMESHEETS.MY_SUBMISSIONS).toBe("/timesheets/submissions");
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

  it("exposes user profile routes", () => {
    expect(ROUTES.USERS.ME).toBe("/users/me");
    expect(ROUTES.USERS.PREFERENCES).toBe("/users/me/preferences");
    expect(ROUTES.USERS.DASHBOARD_LAYOUT).toBe("/users/me/dashboard-layout");
    expect(ROUTES.USERS.PASSWORD).toBe("/users/me/password");
    expect(ROUTES.USERS.SESSIONS).toBe("/users/me/sessions");
    expect(ROUTES.USERS.SESSION("abc")).toBe("/users/me/sessions/abc");
    expect(ROUTES.USERS.TWO_FA_ENABLE).toBe("/users/me/2fa/enable");
  });

  it("validates change password", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "old-secret",
      newPassword: "new-secret"
    });
    expect(r.success).toBe(true);
  });

  it("validates user preferences partial update", () => {
    const r = updateUserPreferencesSchema.safeParse({
      dailyTargetHours: 6,
      theme: "dark",
      dateFormat: "DMY",
      timeFormat: "24h",
      notifications: { enabled: false }
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
      id: UUID,
      email: "a@b.com",
      name: "Sam Rivera",
      firstName: "Sam",
      lastName: "Rivera",
      phone: null,
      location: null,
      avatarUrl: null,
      jobTitle: null,
      department: null,
      workStartDate: null,
      defaultHourlyRate: 100,
      preferences: {},
      effectiveDailyTargetHours: 8,
      effectiveTimezone: "UTC",
      effectiveDateFormat: "MDY",
      effectiveTimeFormat: "12h",
      effectiveTheme: "system",
      twoFactorEnabled: false,
      activityStats: {
        totalHours: 10,
        projectCount: 2,
        memberSince: "2025-01-01T00:00:00.000Z"
      },
      createdAt: "2025-01-01T00:00:00.000Z"
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

  it("exposes project summary and user project color routes", () => {
    expect(ROUTES.REPORTING.PROJECT_SUMMARY(UUID)).toBe(`/reporting/projects/${UUID}/summary`);
    expect(ROUTES.USERS.PROJECT_COLOR(UUID)).toBe(`/users/me/projects/${UUID}/color`);
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
      byCategory: []
    });
    expect(r.success).toBe(true);
  });

  it("exposes workspace members overview route", () => {
    expect(ROUTES.WORKSPACES.MEMBERS_OVERVIEW("ws-1")).toBe("/workspaces/ws-1/members/overview");
    expect(ROUTES.WORKSPACES.MEMBER("ws-1", "m-1")).toBe("/workspaces/ws-1/members/m-1");
  });

  it("validates team members overview shape", () => {
    const r = teamMembersOverviewSchema.safeParse({
      members: [
        {
          id: UUID,
          workspaceId: UUID_2,
          userId: UUID,
          userName: "Sam Rivera",
          userEmail: "sam@kloqra.dev",
          role: "ADMIN",
          status: "active",
          projectCount: 2,
          weekHours: 32.5,
          lastActiveAt: "2025-06-09T10:00:00.000Z",
          isTrackingNow: false,
          memberSince: "2025-01-01T00:00:00.000Z"
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
});
