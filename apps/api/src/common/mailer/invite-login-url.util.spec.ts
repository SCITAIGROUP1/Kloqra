import { describe, expect, it } from "vitest";
import { buildInviteLoginUrl } from "./invite-login-url.util";

describe("buildInviteLoginUrl", () => {
  it("builds login URL with invite and auto params", () => {
    const url = buildInviteLoginUrl("https://app.example.com", "jwt-token");
    expect(url).toBe("https://app.example.com/login?invite=jwt-token&auto=1");
  });

  it("strips trailing slash from origin", () => {
    const url = buildInviteLoginUrl("https://app.example.com/", "jwt-token");
    expect(url).toBe("https://app.example.com/login?invite=jwt-token&auto=1");
  });
});
