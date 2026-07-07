import { NotificationType } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { scopesForNotificationType } from "./workspace-data-sync.js";

describe("scopesForNotificationType", () => {
  it("maps timesheet approval to submissions, timesheet, and timelog scopes", () => {
    expect(scopesForNotificationType(NotificationType.TIMESHEET_APPROVED)).toEqual([
      "submissions",
      "timesheet",
      "timelogs"
    ]);
  });

  it("maps submitted timesheet to admin pending approvals", () => {
    expect(scopesForNotificationType(NotificationType.TIMESHEET_SUBMITTED)).toEqual([
      "pending_approvals"
    ]);
  });

  it("maps project assignment to projects and tasks scopes", () => {
    expect(scopesForNotificationType(NotificationType.PROJECT_ASSIGNMENT)).toEqual([
      "projects",
      "tasks"
    ]);
  });

  it("maps task assignment to projects and tasks scopes", () => {
    expect(scopesForNotificationType(NotificationType.TASK_ASSIGNMENT)).toEqual([
      "projects",
      "tasks"
    ]);
  });

  it("returns empty for unrelated types", () => {
    expect(scopesForNotificationType(NotificationType.EXPORT_SCHEDULE)).toEqual([]);
  });

  it("maps approval settings changes to submissions, timesheet, timelogs, and projects", () => {
    expect(scopesForNotificationType(NotificationType.TIMESHEET_STATUS)).toEqual([
      "submissions",
      "timesheet",
      "timelogs",
      "projects"
    ]);
  });
});
