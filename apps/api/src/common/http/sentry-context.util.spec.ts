import { describe, expect, it } from "vitest";
import { buildSentryEventContext } from "./sentry-context.util";

describe("buildSentryEventContext", () => {
  it("includes tenant and request tags when present", () => {
    const ctx = buildSentryEventContext(
      {
        requestId: "req-1",
        user: {
          userId: "user-1",
          tenantId: "tenant-1",
          workspaceId: "ws-1"
        }
      } as never,
      "trial"
    );

    expect(ctx.tags).toEqual({
      requestId: "req-1",
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "user-1"
    });
    expect(ctx.extra).toEqual({ subscriptionStatus: "trial" });
  });

  it("omits tags when user context is absent", () => {
    const ctx = buildSentryEventContext({ requestId: "req-2" } as never);
    expect(ctx.tags).toEqual({ requestId: "req-2" });
    expect(ctx.extra).toEqual({});
  });
});
