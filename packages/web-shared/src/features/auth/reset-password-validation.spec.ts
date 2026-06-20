import { describe, expect, it } from "vitest";
import {
  RESET_PASSWORD_MISMATCH_MESSAGE,
  validateResetPasswordFields
} from "./reset-password-validation";

describe("validateResetPasswordFields", () => {
  it("uses AC copy for password mismatch", () => {
    expect(validateResetPasswordFields("Password123!", "Password124!")).toEqual({
      confirm: RESET_PASSWORD_MISMATCH_MESSAGE
    });
    expect(RESET_PASSWORD_MISMATCH_MESSAGE).toBe("Passwords do not match. Please re-enter.");
  });

  it("requires minimum password length first", () => {
    expect(validateResetPasswordFields("short", "other")).toEqual({
      password: "Password must be at least 8 characters."
    });
  });

  it("requires uppercase letter", () => {
    expect(validateResetPasswordFields("password123!", "password123!")).toEqual({
      password: "Password must contain at least one uppercase letter."
    });
  });

  it("requires lowercase letter", () => {
    expect(validateResetPasswordFields("PASSWORD123!", "PASSWORD123!")).toEqual({
      password: "Password must contain at least one lowercase letter."
    });
  });

  it("requires number", () => {
    expect(validateResetPasswordFields("Password!!!", "Password!!!")).toEqual({
      password: "Password must contain at least one number."
    });
  });

  it("requires special character", () => {
    expect(validateResetPasswordFields("Password123", "Password123")).toEqual({
      password: "Password must contain at least one special character."
    });
  });

  it("accepts matching complex passwords", () => {
    expect(validateResetPasswordFields("Password123!", "Password123!")).toEqual({});
  });
});
