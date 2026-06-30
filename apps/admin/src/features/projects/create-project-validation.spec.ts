import { describe, expect, it } from "vitest";
import { validateCreateProjectForm } from "./create-project-validation";

describe("validateCreateProjectForm", () => {
  it("requires project name and client", () => {
    expect(validateCreateProjectForm("", "")).toEqual({
      name: "Project name is required.",
      clientName: "Client is required."
    });
  });

  it("requires only missing fields", () => {
    expect(validateCreateProjectForm("Meridian Product Co", "")).toEqual({
      clientName: "Client is required."
    });
    expect(validateCreateProjectForm("", "Acme Corp")).toEqual({
      name: "Project name is required."
    });
  });

  it("accepts trimmed values", () => {
    expect(validateCreateProjectForm("  Meridian  ", "  Acme  ")).toEqual({});
  });
});
