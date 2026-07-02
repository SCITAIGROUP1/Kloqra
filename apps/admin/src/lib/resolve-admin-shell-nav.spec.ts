import { describe, expect, it } from "vitest";
import {
  isAccountModePath,
  resolveAdminShellMode,
  resolveAdminShellNav
} from "./resolve-admin-shell-nav";
import { ADMIN_NAV_ITEMS } from "@/config/admin-nav";

describe("resolveAdminShellNav", () => {
  it("detects account mode paths", () => {
    expect(isAccountModePath("/account")).toBe(true);
    expect(isAccountModePath("/account/billing")).toBe(true);
    expect(isAccountModePath("/profile", { tenantRole: "OWNER" })).toBe(true);
    expect(isAccountModePath("/settings", { tenantRole: "ADMIN" })).toBe(true);
    expect(isAccountModePath("/profile", { tenantRole: "MEMBER" as any })).toBe(false);
    expect(isAccountModePath("/dashboard")).toBe(false);
  });

  it("keeps organization chrome on personal account routes for tenant operators", () => {
    const { mode, navItems } = resolveAdminShellNav({
      pathname: "/settings",
      projectLeadOnly: false,
      workspaceNavItems: ADMIN_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "OWNER" }
    });

    expect(mode).toBe("account");
    expect(navItems.map((item) => item.href)).toContain("/account");
    expect(navItems.some((item) => item.href === "/dashboard")).toBe(false);
  });

  it("returns account nav only on account routes", () => {
    const { mode, navItems } = resolveAdminShellNav({
      pathname: "/account/organization",
      projectLeadOnly: false,
      workspaceNavItems: ADMIN_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "OWNER" }
    });

    expect(mode).toBe("account");
    expect(navItems.map((item) => item.href)).toEqual([
      "/account",
      "/account/workspaces",
      "/account/workspace-admins",
      "/account/organization",
      "/account/members",
      "/account/billing",
      "/account/data-privacy"
    ]);
    expect(navItems.some((item) => item.href === "/dashboard")).toBe(false);
  });

  it("returns operational account nav for organization admin", () => {
    const { navItems } = resolveAdminShellNav({
      pathname: "/account/workspaces",
      projectLeadOnly: false,
      workspaceNavItems: ADMIN_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "ADMIN" }
    });

    expect(navItems.map((item) => item.href)).toEqual([
      "/account/workspaces",
      "/account/workspace-admins",
      "/account/organization"
    ]);
  });

  it("returns workspace nav only on workspace routes", () => {
    const { mode, navItems } = resolveAdminShellNav({
      pathname: "/dashboard",
      projectLeadOnly: false,
      workspaceNavItems: ADMIN_NAV_ITEMS,
      pendingCount: 2,
      notificationUnreadCount: 1,
      session: { tenantRole: "OWNER" }
    });

    expect(mode).toBe("workspace");
    expect(resolveAdminShellMode("/dashboard")).toBe("workspace");
    expect(resolveAdminShellMode("/settings", { tenantRole: "OWNER" })).toBe("account");
    expect(navItems.some((item) => item.href.startsWith("/account"))).toBe(false);
    expect(navItems.find((item) => item.href === "/approvals")?.badge).toBe(2);
    expect(navItems.find((item) => item.href === "/notifications")?.badge).toBe(1);
  });

  it("returns filtered nav for project managers", () => {
    const { navItems } = resolveAdminShellNav({
      pathname: "/projects",
      projectLeadOnly: true,
      workspaceNavItems: ADMIN_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: undefined
    });

    expect(navItems.map((item) => item.href)).toEqual([
      "/dashboard",
      "/projects",
      "/team",
      "/approvals",
      "/time-tracker",
      "/notifications"
    ]);
  });
});
