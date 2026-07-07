import { describe, expect, it } from "vitest";
import { FATAL_AUTH_REASONS, isFatalAuthResponse } from "./auth-fatal-reasons";

describe("auth-fatal-reasons", () => {
  it("treats 401 and 403 as fatal", () => {
    expect(isFatalAuthResponse(401)).toBe(true);
    expect(isFatalAuthResponse(403)).toBe(true);
    expect(isFatalAuthResponse(500)).toBe(false);
  });

  it("treats known fatal reasons as fatal", () => {
    for (const reason of FATAL_AUTH_REASONS) {
      expect(isFatalAuthResponse(400, { details: { reason } })).toBe(true);
    }
  });
});
