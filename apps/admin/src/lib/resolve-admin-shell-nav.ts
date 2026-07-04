import type { AuthSessionDto } from "@kloqra/contracts";
import type { SidebarNavItem } from "@kloqra/ui";
import type { AdminNavItem } from "@/config/admin-nav";
import { projectLeadNavItems } from "@/config/project-manager-nav";
import { resolveAccountNavItems } from "@/lib/resolve-account-nav";

export type AdminShellMode = "account" | "workspace";

export function isAccountModePath(pathname: string): boolean {
  if (pathname === "/account" || pathname.startsWith("/account/")) return true;
  // Personal paths (/settings, /profile, /notifications) are always personal —
  // they must NOT trigger account mode even when the user is an owner/admin.
  return false;
}

export function resolveAdminShellMode(
  pathname: string,
  _session?: Pick<AuthSessionDto, "tenantRole"> | null
): AdminShellMode {
  return isAccountModePath(pathname) ? "account" : "workspace";
}

function mapAccountNav(
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined
): SidebarNavItem[] {
  return resolveAccountNavItems(session).map((item) => ({
    href: item.href,
    label: item.label,
    Icon: item.Icon
  }));
}

function mapWorkspaceNav(
  items: readonly AdminNavItem[],
  badges: { pendingCount: number; notificationUnreadCount: number }
): SidebarNavItem[] {
  return items.map((item) => {
    if (item.href === "/approvals") return { ...item, badge: badges.pendingCount };
    if (item.href === "/notifications") return { ...item, badge: badges.notificationUnreadCount };
    return item;
  });
}

export function resolveAdminShellNav(options: {
  pathname: string;
  projectLeadOnly: boolean;
  workspaceNavItems: readonly AdminNavItem[];
  pendingCount: number;
  notificationUnreadCount: number;
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined;
}): { mode: AdminShellMode; navItems: SidebarNavItem[] } {
  const mode = resolveAdminShellMode(options.pathname, options.session);

  if (mode === "account") {
    return { mode, navItems: mapAccountNav(options.session) };
  }

  const baseItems = options.projectLeadOnly ? projectLeadNavItems() : options.workspaceNavItems;

  return {
    mode,
    navItems: mapWorkspaceNav(baseItems, {
      pendingCount: options.pendingCount,
      notificationUnreadCount: options.notificationUnreadCount
    })
  };
}
