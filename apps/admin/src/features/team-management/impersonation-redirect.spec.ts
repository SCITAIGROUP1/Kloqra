import { describe, expect, it } from "vitest";
import { buildClientImpersonationUrl } from "./impersonation-redirect";

describe("buildClientImpersonationUrl", () => {
  it("builds a dashboard URL with an encoded handoff token", () => {
    expect(buildClientImpersonationUrl("http://localhost:3000", "handoff-token")).toBe(
      "http://localhost:3000/dashboard?handoff=handoff-token"
    );
  });

  it("rejects empty handoff tokens", () => {
    expect(() => buildClientImpersonationUrl("http://localhost:3000", "")).toThrow(
      "Impersonation handoff token missing from API response"
    );
    expect(() => buildClientImpersonationUrl("http://localhost:3000", "   ")).toThrow(
      "Impersonation handoff token missing from API response"
    );
  });
});
