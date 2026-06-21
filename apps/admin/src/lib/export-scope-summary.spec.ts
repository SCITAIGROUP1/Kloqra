import { describe, expect, it } from "vitest";
import { buildExportScopeSummary } from "./export-scope-summary";

describe("buildExportScopeSummary", () => {
  it("describes workspace-wide scope", () => {
    expect(buildExportScopeSummary({ projectIds: [], userIds: [] })).toEqual({
      projectsLabel: "All projects",
      membersLabel: "All team members",
      extras: [],
      isWorkspaceWide: true
    });
  });

  it("shows single project and member names", () => {
    expect(
      buildExportScopeSummary({
        projectIds: ["p1"],
        userIds: ["u1"],
        projectNames: ["Brand Campaign Q2"],
        userNames: ["Taylor Brooks"]
      })
    ).toMatchObject({
      projectsLabel: "Brand Campaign Q2",
      membersLabel: "Taylor Brooks",
      isWorkspaceWide: false
    });
  });

  it("summarizes multiple selections with overflow", () => {
    const summary = buildExportScopeSummary({
      projectIds: ["p1", "p2", "p3"],
      userIds: ["u1", "u2"],
      projectNames: ["Alpha", "Beta", "Gamma"],
      userNames: ["Taylor Brooks", "Alex Chen"]
    });
    expect(summary.projectsLabel).toBe("Alpha, Beta (+1 more)");
    expect(summary.membersLabel).toBe("Taylor Brooks, Alex Chen");
  });
});
