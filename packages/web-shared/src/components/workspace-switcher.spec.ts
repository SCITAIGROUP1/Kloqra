import { describe, expect, it } from "vitest";
import { filterWorkspacesByQuery, formatWorkspaceRole } from "./workspace-switcher";

const workspaces = [
  { id: "1", name: "Acme Corporation", slug: "acme", role: "ADMIN" as const },
  { id: "2", name: "TechStart Inc", slug: "techstart", role: "MEMBER" as const },
  { id: "3", name: "Design Studio", slug: "design", role: "ADMIN" as const }
];

describe("formatWorkspaceRole", () => {
  it("maps workspace roles to display labels", () => {
    expect(formatWorkspaceRole("ADMIN")).toBe("Admin");
    expect(formatWorkspaceRole("MEMBER")).toBe("Member");
  });
});

describe("filterWorkspacesByQuery", () => {
  it("returns all workspaces when query is empty", () => {
    expect(filterWorkspacesByQuery(workspaces, "")).toEqual(workspaces);
    expect(filterWorkspacesByQuery(workspaces, "   ")).toEqual(workspaces);
  });

  it("filters workspaces by name", () => {
    expect(filterWorkspacesByQuery(workspaces, "tech")).toEqual([workspaces[1]]);
    expect(filterWorkspacesByQuery(workspaces, "design")).toEqual([workspaces[2]]);
  });
});
