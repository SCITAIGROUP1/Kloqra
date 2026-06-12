import { describe, expect, it } from "vitest";
import {
  buildProjectDetailNavItems,
  projectListHref,
  resolveProjectDetailSection
} from "./project-detail-nav";

describe("project-detail-nav", () => {
  it("builds section hrefs for a project", () => {
    expect(buildProjectDetailNavItems("proj-1")).toEqual([
      expect.objectContaining({ id: "overview", href: "/projects/proj-1/overview" }),
      expect.objectContaining({ id: "tasks", href: "/projects/proj-1/tasks" }),
      expect.objectContaining({ id: "team", href: "/projects/proj-1/team" }),
      expect.objectContaining({ id: "settings", href: "/projects/proj-1/settings" })
    ]);
  });

  it("links project list rows to the overview tab", () => {
    expect(projectListHref("proj-1")).toBe("/projects/proj-1/overview");
  });

  it("maps paths to section ids", () => {
    expect(resolveProjectDetailSection("/projects/x/overview")).toBe("overview");
    expect(resolveProjectDetailSection("/projects/x/tasks")).toBe("tasks");
    expect(resolveProjectDetailSection("/projects/x/team")).toBe("team");
    expect(resolveProjectDetailSection("/projects/x/settings")).toBe("settings");
  });
});
