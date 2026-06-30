import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { resolveWorkspaceId } from "./resolve-workspace-id";

describe("resolveWorkspaceId", () => {
  it("uses token workspace when header omitted", () => {
    expect(resolveWorkspaceId("ws-token", undefined)).toBe("ws-token");
  });

  it("uses header when token has no workspace", () => {
    expect(resolveWorkspaceId(undefined, "ws-header")).toBe("ws-header");
  });

  it("rejects mismatched header and token", () => {
    expect(() => resolveWorkspaceId("ws-a", "ws-b")).toThrow(ForbiddenException);
  });

  it("throws when both missing", () => {
    expect(() => resolveWorkspaceId(undefined, undefined)).toThrow(UnauthorizedException);
  });
});
