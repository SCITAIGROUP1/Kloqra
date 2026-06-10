import { describe, expect, it } from "vitest";
import { buildProjectDetailNavItems, resolveProjectDetailSection } from "./project-detail-nav";

describe("project-detail-nav", () => {
  it("builds section hrefs for a project", () => {
    expect(buildProjectDetailNavItems("proj-1")).toEqual([
      expect.objectContaining({ id: "tasks", href: "/projects/proj-1/tasks" }),
      expect.objectContaining({ id: "team", href: "/projects/proj-1/team" }),
      expect.objectContaining({ id: "settings", href: "/projects/proj-1/settings" })
    ]);
  });

  it("maps paths to section ids", () => {
    expect(resolveProjectDetailSection("/projects/x/tasks")).toBe("tasks");
    expect(resolveProjectDetailSection("/projects/x/team")).toBe("team");
    expect(resolveProjectDetailSection("/projects/x/settings")).toBe("settings");
  });
});
