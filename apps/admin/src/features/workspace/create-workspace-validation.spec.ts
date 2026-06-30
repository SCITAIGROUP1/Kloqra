import { describe, expect, it } from "vitest";
import { validateCreateWorkspaceForm } from "./create-workspace-validation";

describe("validateCreateWorkspaceForm", () => {
  it("requires workspace name", () => {
    expect(validateCreateWorkspaceForm("")).toEqual({
      name: "Workspace name is required."
    });
  });

  it("rejects whitespace-only names", () => {
    expect(validateCreateWorkspaceForm("   ")).toEqual({
      name: "Workspace name is required."
    });
  });

  it("accepts trimmed values", () => {
    expect(validateCreateWorkspaceForm("  Design Agency  ")).toEqual({});
  });
});
