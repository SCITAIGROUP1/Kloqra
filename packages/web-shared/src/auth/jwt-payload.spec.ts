import { describe, expect, it } from "vitest";
import { isAccessTokenExpired, readWorkspaceIdFromToken } from "./jwt-payload";

function makeToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${body}.sig`;
}

describe("jwt-payload", () => {
  it("readWorkspaceIdFromToken reads workspaceId", () => {
    const token = makeToken({ workspaceId: "ws-123" });
    expect(readWorkspaceIdFromToken(token)).toBe("ws-123");
  });

  it("isAccessTokenExpired detects expired tokens", () => {
    const expired = makeToken({ exp: Math.floor(Date.now() / 1000) - 10 });
    const valid = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isAccessTokenExpired(expired)).toBe(true);
    expect(isAccessTokenExpired(valid)).toBe(false);
    expect(isAccessTokenExpired(null)).toBe(true);
  });
});
