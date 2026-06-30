import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelProactiveRefresh,
  configureProactiveRefresh,
  scheduleProactiveRefresh
} from "./token-scheduler";

function makeToken(expSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
  return `h.${body}.s`;
}

describe("token-scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    configureProactiveRefresh(async () => "new-token");
  });

  afterEach(() => {
    cancelProactiveRefresh();
    vi.useRealTimers();
  });

  it("schedules refresh before token expiry", async () => {
    const handler = vi.fn(async () => "t");
    configureProactiveRefresh(handler);

    const exp = Math.floor(Date.now() / 1000) + 600;
    scheduleProactiveRefresh(makeToken(exp));

    await vi.advanceTimersByTimeAsync(7 * 60 * 1000);
    expect(handler).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(handler).toHaveBeenCalledOnce();
  });
});
