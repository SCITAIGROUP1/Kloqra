import { describe, expect, it } from "vitest";
import { extractFieldErrorsFromMessage } from "./form-errors";

describe("extractFieldErrorsFromMessage", () => {
  it("maps validation details to known field labels", () => {
    const result = extractFieldErrorsFromMessage(
      "Validation failed — Email is required; Password is required",
      { email: "Email", password: "Password" }
    );

    expect(result.fieldErrors).toEqual({
      email: "Email is required",
      password: "Password is required"
    });
    expect(result.formError).toBe("");
  });

  it("keeps unknown details in form error", () => {
    const result = extractFieldErrorsFromMessage(
      "Validation failed — Email is required; Workspace is archived",
      { email: "Email", password: "Password" }
    );

    expect(result.fieldErrors).toEqual({
      email: "Email is required"
    });
    expect(result.formError).toBe("Workspace is archived");
  });

  it("returns non-validation message as form error", () => {
    const result = extractFieldErrorsFromMessage("Invalid email or password. Please try again.", {
      email: "Email",
      password: "Password"
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.formError).toBe("Invalid email or password. Please try again.");
  });
});
