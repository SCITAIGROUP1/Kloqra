import type { SidebarNavItem } from "@kloqra/ui";
import {
  PLATFORM_ACCOUNT_NAV_ITEMS,
  type PlatformAccountNavItem
} from "@/config/platform-account-nav";

export type PlatformShellMode = "account" | "console";

const CONSOLE_PATH_PREFIXES = [
  "/ops",
  "/tenants",
  "/subscriptions",
  "/plans",
  "/helpdesk",
  "/audit",
  "/notifications"
] as const;

export function isPlatformAccountPath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/settings");
}

export function resolvePlatformShellMode(pathname: string): PlatformShellMode {
  return isPlatformAccountPath(pathname) ? "account" : "console";
}

function mapAccountNav(items: readonly PlatformAccountNavItem[]): SidebarNavItem[] {
  return items.map((item) => ({
    href: item.href,
    label: item.label,
    Icon: item.Icon
  }));
}

export function resolvePlatformShellNav(options: {
  pathname: string;
  consoleNavItems: readonly SidebarNavItem[];
  notificationUnreadCount: number;
  platformRole?: string;
}): { mode: PlatformShellMode; navItems: SidebarNavItem[] } {
  const mode = resolvePlatformShellMode(options.pathname);

  if (mode === "account") {
    return { mode, navItems: mapAccountNav(PLATFORM_ACCOUNT_NAV_ITEMS) };
  }

  let visibleItems = [...options.consoleNavItems];

  if (options.platformRole === "SUPPORT") {
    // Support agents only see specific modules
    const allowedHrefs = ["/helpdesk", "/notifications", "/profile", "/settings"];
    visibleItems = visibleItems.filter((item) => allowedHrefs.includes(item.href));
  }

  return {
    mode,
    navItems: visibleItems.map((item) =>
      item.href === "/notifications" ? { ...item, badge: options.notificationUnreadCount } : item
    )
  };
}

export function isConsolePath(pathname: string): boolean {
  if (pathname === "/") return true;
  return CONSOLE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
