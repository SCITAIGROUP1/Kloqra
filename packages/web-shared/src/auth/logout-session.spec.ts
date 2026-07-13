import { describe, expect, it } from "vitest";
import {
  beginLogout,
  invalidatePendingLogout,
  isLogoutEpochCurrent,
  isLogoutInFlight
} from "./logout-session";

describe("logout-session", () => {
  it("marks logout in flight until invalidated", () => {
    const epoch = beginLogout();
    expect(isLogoutInFlight()).toBe(true);
    expect(isLogoutEpochCurrent(epoch)).toBe(true);

    invalidatePendingLogout();
    expect(isLogoutInFlight()).toBe(false);
    expect(isLogoutEpochCurrent(epoch)).toBe(false);
  });
});
