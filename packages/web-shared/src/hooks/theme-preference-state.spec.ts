import { describe, expect, it, beforeEach } from "vitest";
import {
  clearThemeHydration,
  markThemeHydrated,
  shouldHydrateTheme
} from "./theme-preference-state";

describe("theme-preference-state", () => {
  beforeEach(() => {
    clearThemeHydration();
  });

  it("hydrates once per user until cleared", () => {
    expect(shouldHydrateTheme("user-1")).toBe(true);
    markThemeHydrated("user-1");
    expect(shouldHydrateTheme("user-1")).toBe(false);
    expect(shouldHydrateTheme("user-2")).toBe(true);
  });

  it("clears hydration on logout", () => {
    markThemeHydrated("user-1");
    clearThemeHydration();
    expect(shouldHydrateTheme("user-1")).toBe(true);
  });
});
