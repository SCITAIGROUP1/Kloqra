import { beforeEach, describe, expect, it } from "vitest";
import { clearStoredThemePreference, themeStorageKey } from "./theme-storage";

describe("theme-storage", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("theme", "dark");
    localStorage.setItem("kloqra-theme-user-1", "light");
    localStorage.setItem("kloqra-theme-guest", "system");
  });

  it("builds scoped storage keys", () => {
    expect(themeStorageKey("user-1")).toBe("kloqra-theme-user-1");
    expect(themeStorageKey(null)).toBe("kloqra-theme-guest");
  });

  it("clears legacy and scoped theme keys", () => {
    clearStoredThemePreference("user-1");

    expect(localStorage.getItem("theme")).toBeNull();
    expect(localStorage.getItem("kloqra-theme-user-1")).toBeNull();
    expect(localStorage.getItem("kloqra-theme-guest")).toBeNull();
  });
});
