import { describe, expect, it } from "vitest";
import {
  buildAdminApprovalsHref,
  buildMemberSubmissionsHref,
  hasActiveApprovalsFilter,
  parseAdminApprovalsSearch,
  parseMemberSubmissionsSearch
} from "./submission-deep-link";

describe("submission deep links", () => {
  it("builds member submissions href", () => {
    expect(
      buildMemberSubmissionsHref({
        projectId: "p1",
        periodStart: "2026-06-09T00:00:00.000Z",
        highlight: "remind"
      })
    ).toBe("/submissions?projectId=p1&periodStart=2026-06-09T00%3A00%3A00.000Z&highlight=remind");
  });

  it("builds admin approvals href", () => {
    expect(
      buildAdminApprovalsHref({
        tab: "amendments",
        amendmentId: "a1",
        projectId: "p1",
        userId: "u1",
        from: "2026-03-01",
        to: "2026-03-31"
      })
    ).toBe(
      "/approvals?tab=amendments&amendmentId=a1&projectId=p1&userId=u1&from=2026-03-01&to=2026-03-31"
    );
  });

  it("parses search params", () => {
    expect(parseMemberSubmissionsSearch("projectId=p1&periodStart=iso&highlight=rejected")).toEqual(
      {
        projectId: "p1",
        periodStart: "iso",
        highlight: "rejected",
        view: undefined
      }
    );
    expect(parseMemberSubmissionsSearch("view=table")).toEqual({
      projectId: undefined,
      periodStart: undefined,
      highlight: undefined,
      view: "table"
    });
    expect(parseAdminApprovalsSearch("tab=review&periodId=x&projectId=p1&userId=u1")).toEqual({
      tab: "review",
      periodId: "x",
      amendmentId: undefined,
      batch: undefined,
      projectId: "p1",
      userId: "u1",
      from: undefined,
      to: undefined
    });
  });

  it("detects active filters", () => {
    expect(hasActiveApprovalsFilter({})).toBe(false);
    expect(hasActiveApprovalsFilter({ projectId: ["p1"] })).toBe(true);
  });
});
