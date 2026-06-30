import { describe, expect, it } from "vitest";
import {
  buildMemberTimesheetHref,
  buildMemberTimesheetHrefFromSubmission,
  parseMemberTimesheetSearch,
  viewForApprovalPeriod
} from "./timesheet-deep-link";

describe("timesheet deep links", () => {
  it("builds href with project, date, and view", () => {
    expect(
      buildMemberTimesheetHref({
        projectId: "p1",
        date: "2026-06-08T00:00:00.000Z",
        view: "day"
      })
    ).toBe("/timesheet?projectId=p1&date=2026-06-08T00%3A00%3A00.000Z&view=day");
    expect(buildMemberTimesheetHref({ date: "2026-06-08T00:00:00.000Z" })).toBe(
      "/timesheet?date=2026-06-08T00%3A00%3A00.000Z"
    );
  });

  it("builds href from submission period metadata", () => {
    expect(
      buildMemberTimesheetHrefFromSubmission({
        projectId: "p1",
        periodStart: "2026-06-08T00:00:00.000Z",
        approvalPeriod: "weekly"
      })
    ).toBe("/timesheet?projectId=p1&date=2026-06-08T00%3A00%3A00.000Z");
  });

  it("maps approval period to calendar view", () => {
    expect(viewForApprovalPeriod("daily")).toBe("day");
    expect(viewForApprovalPeriod("monthly")).toBe("month");
    expect(viewForApprovalPeriod("weekly")).toBe("week");
  });

  it("parses search params", () => {
    expect(parseMemberTimesheetSearch("projectId=p1&date=iso&view=month")).toEqual({
      projectId: "p1",
      date: "iso",
      view: "month"
    });
  });
});
