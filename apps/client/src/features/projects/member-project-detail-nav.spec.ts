import { describe, it, expect } from "vitest";
import { resolveMemberProjectDetailSection } from "./member-project-detail-nav";

describe("resolveMemberProjectDetailSection", () => {
  it("returns 'overview' for the project root path", () => {
    expect(resolveMemberProjectDetailSection("/projects/abc123")).toBe("overview");
  });

  it("returns 'team' for the /team path", () => {
    expect(resolveMemberProjectDetailSection("/projects/abc123/team")).toBe("team");
  });

  it("returns 'tasks' for the /tasks path", () => {
    expect(resolveMemberProjectDetailSection("/projects/abc123/tasks")).toBe("tasks");
  });

  it("prefers 'tasks' over 'overview' when both substrings are present", () => {
    // Edge case: /tasks/overview — tasks wins because it is checked first
    expect(resolveMemberProjectDetailSection("/projects/abc123/tasks/overview")).toBe("tasks");
  });
});
