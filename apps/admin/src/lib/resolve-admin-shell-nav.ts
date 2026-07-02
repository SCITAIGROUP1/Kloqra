import type { AuthSessionDto } from "@kloqra/contracts";
import type { SidebarNavItem } from "@kloqra/ui";
import { canAccessAccountMode, isPersonalAccountPath } from "@kloqra/web-shared";
import type { AdminNavItem } from "@/config/admin-nav";
import { projectLeadNavItems } from "@/config/project-manager-nav";
import { resolveAccountNavItems } from "@/lib/resolve-account-nav";

export type AdminShellMode = "account" | "workspace";

export function isAccountModePath(
  pathname: string,
  session?: Pick<AuthSessionDto, "tenantRole"> | null
): boolean {
  if (pathname === "/account" || pathname.startsWith("/account/")) return true;
  return isPersonalAccountPath(pathname) && canAccessAccountMode(session);
}

export function resolveAdminShellMode(
  pathname: string,
  session?: Pick<AuthSessionDto, "tenantRole"> | null
): AdminShellMode {
  return isAccountModePath(pathname, session) ? "account" : "workspace";
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
