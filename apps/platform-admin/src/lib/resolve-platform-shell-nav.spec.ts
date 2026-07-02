import { describe, expect, it } from "vitest";
import {
  isPlatformAccountPath,
  resolvePlatformShellMode,
  resolvePlatformShellNav
} from "./resolve-platform-shell-nav";

describe("resolvePlatformShellNav", () => {
  const consoleNav = [{ href: "/tenants", label: "Tenants", Icon: () => null }];

  it("uses console nav on tenant routes", () => {
    const result = resolvePlatformShellNav({
      pathname: "/tenants",
      consoleNavItems: consoleNav,
      notificationUnreadCount: 0
    });
    expect(result.mode).toBe("console");
    expect(result.navItems[0]?.href).toBe("/tenants");
  });

  it("uses account nav on profile and settings", () => {
    expect(resolvePlatformShellMode("/profile")).toBe("account");
    expect(resolvePlatformShellMode("/settings")).toBe("account");
    expect(isPlatformAccountPath("/settings")).toBe(true);

    const result = resolvePlatformShellNav({
      pathname: "/settings",
      consoleNavItems: consoleNav,
      notificationUnreadCount: 2
    });
    expect(result.mode).toBe("account");
    expect(result.navItems.map((item) => item.href)).toEqual(["/profile", "/settings"]);
  });
});
