import type { AdminNavItem } from "./admin-nav";
import { ADMIN_NAV_ITEMS } from "./admin-nav";

const LEAD_ALLOWED_HREFS = new Set([
  "/dashboard",
  "/projects",
  "/approvals",
  "/time-tracker",
  "/team",
  "/notifications"
]);

/** Nav items visible to workspace MEMBERs who lead at least one project. */
export function projectLeadNavItems(): readonly AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => LEAD_ALLOWED_HREFS.has(item.href));
}

export { canAccessAdminApp } from "@kloqra/web-shared";

export function isProjectLeadOnly(
  workspaceRole: "ADMIN" | "MEMBER" | undefined,
  ledProjectIds: string[] | undefined
): boolean {
  return workspaceRole === "MEMBER" && Boolean(ledProjectIds && ledProjectIds.length > 0);
}
