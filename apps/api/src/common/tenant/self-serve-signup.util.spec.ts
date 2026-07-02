import { describe, expect, it } from "vitest";
import { isSelfServeSignupEnabled } from "./self-serve-signup.util";

describe("isSelfServeSignupEnabled", () => {
  it("is false unless env is true", () => {
    const prev = process.env.SELF_SERVE_SIGNUP_ENABLED;
    process.env.SELF_SERVE_SIGNUP_ENABLED = "false";
    expect(isSelfServeSignupEnabled()).toBe(false);
    process.env.SELF_SERVE_SIGNUP_ENABLED = "true";
    expect(isSelfServeSignupEnabled()).toBe(true);
    process.env.SELF_SERVE_SIGNUP_ENABLED = prev;
  });
});
