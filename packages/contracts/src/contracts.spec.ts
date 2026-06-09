import { describe, expect, it } from "vitest";
import {
  createCategorySchema,
  createTaskSchema,
  createTimeLogSchema,
  loginSchema,
  reportQuerySchema,
  ROUTES,
  startTimerSchema,
  dashboardReportSchema,
  updateCategorySchema
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

  it("exposes timesheet submissions route", () => {
    expect(ROUTES.TIMESHEETS.MY_SUBMISSIONS).toBe("/timesheets/submissions");
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
      weeklyHours: [],
      dailyHours: [],
      dailyByProject: []
    });
    expect(r.success).toBe(true);
  });
});
