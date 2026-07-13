import { describe, expect, it } from "vitest";
import { ApiRequestError } from "../api/client";
import { classifyBootstrapError, shouldRedirectBootstrapToLogin } from "./bootstrap-failure";

describe("classifyBootstrapError", () => {
  it("treats 401/403 as auth failures", () => {
    expect(classifyBootstrapError(new ApiRequestError("Unauthorized", 401))).toBe(
      "unauthenticated"
    );
    expect(classifyBootstrapError(new ApiRequestError("Forbidden", 403))).toBe("forbidden");
  });

  it("treats network and server errors as transient", () => {
    expect(classifyBootstrapError(new ApiRequestError("Boom", 503))).toBe("transient");
    expect(classifyBootstrapError(new TypeError("Failed to fetch"))).toBe("transient");
  });
});

describe("shouldRedirectBootstrapToLogin", () => {
  it("redirects only for auth failures", () => {
    expect(shouldRedirectBootstrapToLogin("unauthenticated")).toBe(true);
    expect(shouldRedirectBootstrapToLogin("forbidden")).toBe(true);
    expect(shouldRedirectBootstrapToLogin(undefined)).toBe(true);
    expect(shouldRedirectBootstrapToLogin("transient")).toBe(false);
  });
});
