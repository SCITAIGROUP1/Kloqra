/** @vitest-environment jsdom */
import type { AuthSessionDto } from "@kloqra/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload })
  ).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("shouldApplyBootstrapSession", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    process.env.NEXT_PUBLIC_AUTH_SCOPE = "client";
  });

  afterEach(() => {
    localStorage.clear();
    delete process.env.NEXT_PUBLIC_AUTH_SCOPE;
  });

  it("rejects stale bootstrap when another login replaced the access token", async () => {
    const samToken = makeToken({ sub: "user-sam" });
    const newMemberToken = makeToken({ sub: "user-new" });
    localStorage.setItem("cm-client-access-token", newMemberToken);

    const { shouldApplyBootstrapSession } = await import("./bootstrap-session");
    const { useSessionStore } = await import("../stores/session.store");

    useSessionStore.setState({
      session: {
        user: { id: "user-new", name: "New Member" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "MEMBER"
      } as AuthSessionDto,
      accessToken: newMemberToken
    });

    expect(
      shouldApplyBootstrapSession(samToken, {
        user: { id: "user-sam", name: "Sam Rivera" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "MEMBER"
      } as AuthSessionDto)
    ).toBe(false);
  });

  it("accepts bootstrap when token and session still match", async () => {
    const token = makeToken({ sub: "user-1" });
    localStorage.setItem("cm-client-access-token", token);

    const { shouldApplyBootstrapSession } = await import("./bootstrap-session");

    expect(
      shouldApplyBootstrapSession(token, {
        user: { id: "user-1", name: "Member" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "MEMBER"
      } as AuthSessionDto)
    ).toBe(true);
  });
});
