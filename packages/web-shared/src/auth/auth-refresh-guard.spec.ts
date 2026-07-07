import { describe, expect, it } from "vitest";
import {
  getAuthRefreshGeneration,
  invalidateAuthRefresh,
  isAuthRefreshStale
} from "./auth-refresh-guard";

describe("auth-refresh-guard", () => {
  it("marks prior refresh generations stale after invalidation", () => {
    const generation = getAuthRefreshGeneration();
    expect(isAuthRefreshStale(generation)).toBe(false);
    invalidateAuthRefresh();
    expect(isAuthRefreshStale(generation)).toBe(true);
  });
});
