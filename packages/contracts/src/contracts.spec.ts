import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  createCategorySchema,
  createTaskSchema,
  createTimeLogSchema,
  loginSchema,
  reportQuerySchema,
  resolveEffectiveDailyTargetHours,
  resolveEffectiveTimezone,
  ROUTES,
  startTimerSchema,
  dashboardReportSchema,
  updateCategorySchema,
  updateUserPreferencesSchema
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

  it("exposes user profile routes", () => {
    expect(ROUTES.USERS.ME).toBe("/users/me");
    expect(ROUTES.USERS.PREFERENCES).toBe("/users/me/preferences");
    expect(ROUTES.USERS.PASSWORD).toBe("/users/me/password");
  });

  it("validates change password", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "old-secret",
      newPassword: "new-secret"
    });
    expect(r.success).toBe(true);
  });

  it("validates user preferences partial update", () => {
    const r = updateUserPreferencesSchema.safeParse({ dailyTargetHours: 6 });
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

  it("accepts task with categoryId", () => {
    const r = createTaskSchema.safeParse({
      projectId: UUID,
      categoryId: UUID_2,
      taskName: "Implement feature"
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
