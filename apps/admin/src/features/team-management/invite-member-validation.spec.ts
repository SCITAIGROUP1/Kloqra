import { describe, expect, it } from "vitest";
import { validateInviteMemberForm } from "./invite-member-validation";

describe("validateInviteMemberForm", () => {
  it("requires email and name", () => {
    expect(validateInviteMemberForm("", "")).toEqual({
      email: "Email is required.",
      name: "Name is required."
    });
  });

  it("validates email format", () => {
    expect(validateInviteMemberForm("not-an-email", "Alex Chen")).toEqual({
      email: "Email must be a valid email address."
    });
  });

  it("accepts valid values", () => {
    expect(validateInviteMemberForm("alex@example.com", "Alex Chen")).toEqual({});
  });
});
