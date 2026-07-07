import { describe, expect, it } from "vitest";
import {
  clearInflightGetRequests,
  clearInflightGetRequestsForPath,
  getInflightGetRequests
} from "./inflight-requests";

describe("inflight-requests", () => {
  it("clears only matching inflight GET keys", async () => {
    const inflight = getInflightGetRequests();
    inflight.set("user:GET:/timelogs?from=1:ws-1", Promise.resolve([]));
    inflight.set("user:GET:/projects:ws-1", Promise.resolve([]));

    clearInflightGetRequestsForPath("/timelogs");

    expect(inflight.has("user:GET:/timelogs?from=1:ws-1")).toBe(false);
    expect(inflight.has("user:GET:/projects:ws-1")).toBe(true);

    clearInflightGetRequests();
    expect(inflight.size).toBe(0);
  });
});
