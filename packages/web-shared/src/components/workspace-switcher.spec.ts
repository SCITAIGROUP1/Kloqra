import { describe, expect, it } from "vitest";
import {
  formatAdminWorkspaceAccessLabel,
  formatMemberPortalWorkspaceLabel,
  formatWorkspaceRole
} from "../auth/admin-access-label";
import { filterWorkspacesByQuery } from "./workspace-switcher";

const workspaces = [
  { id: "1", name: "Acme Corporation", slug: "acme", role: "ADMIN" as const },
  { id: "2", name: "TechStart Inc", slug: "techstart", role: "MEMBER" as const },
  { id: "3", name: "Design Studio", slug: "design", role: "ADMIN" as const }
];

describe("formatWorkspaceRole", () => {
  it("maps workspace roles to display labels", () => {
    expect(formatWorkspaceRole("ADMIN")).toBe("Workspace admin");
    expect(formatWorkspaceRole("MEMBER")).toBe("Member");
  });
});

describe("formatMemberPortalWorkspaceLabel", () => {
  it("always shows Member regardless of elevated access", () => {
    expect(formatMemberPortalWorkspaceLabel()).toBe("Member");
  });
});

describe("formatAdminWorkspaceAccessLabel", () => {
  it("labels project managers as project managers in admin chrome", () => {
    expect(formatAdminWorkspaceAccessLabel("MEMBER", ["project-1"])).toBe("Project manager");
    expect(formatAdminWorkspaceAccessLabel("ADMIN")).toBe("Workspace admin");
    expect(formatAdminWorkspaceAccessLabel("ADMIN", undefined, "ADMIN")).toBe("Organization admin");
  });

  it("shows owner hat alongside workspace access when tenant is owner", () => {
    expect(formatAdminWorkspaceAccessLabel("ADMIN", undefined, "OWNER")).toBe(
      "Owner · Workspace admin"
    );
    expect(formatAdminWorkspaceAccessLabel("MEMBER", ["project-1"], "OWNER")).toBe(
      "Owner · Project manager"
    );
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
