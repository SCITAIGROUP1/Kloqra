import { describe, expect, it } from "vitest";
import { validateAssignWorkspaceAdminForm } from "./assign-workspace-admin-validation";
import { validateCreateWorkspaceForm } from "./create-workspace-validation";

describe("validateCreateWorkspaceForm", () => {
  it("requires workspace name", () => {
    expect(validateCreateWorkspaceForm("")).toEqual({ name: "Workspace name is required." });
    expect(validateCreateWorkspaceForm("  ")).toEqual({ name: "Workspace name is required." });
    expect(validateCreateWorkspaceForm("Acme")).toEqual({});
  });
});

describe("validateAssignWorkspaceAdminForm", () => {
  it("requires email and name", () => {
    expect(validateAssignWorkspaceAdminForm("", "")).toMatchObject({
      email: "Email is required.",
      name: "Name is required."
    });
    expect(validateAssignWorkspaceAdminForm("bad", "Admin")).toMatchObject({
      email: "Email must be valid."
    });
    expect(validateAssignWorkspaceAdminForm("admin@kloqra.dev", "Admin User")).toEqual({});
  });
});
