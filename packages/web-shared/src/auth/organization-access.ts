import type { AuthSessionDto } from "@kloqra/contracts";

/** Organization owner or organization admin (tenant ADMIN). */
export function canManageOrganization(
  session: Partial<Pick<AuthSessionDto, "tenantRole">> | null | undefined
): boolean {
  return session?.tenantRole === "OWNER" || session?.tenantRole === "ADMIN";
}

export function isOrganizationOwner(
  session: Partial<Pick<AuthSessionDto, "tenantRole">> | null | undefined
): boolean {
  return session?.tenantRole === "OWNER";
}

export function canAccessAccountMode(
  session: Partial<Pick<AuthSessionDto, "tenantRole">> | null | undefined
): boolean {
  return canManageOrganization(session);
}

const OWNER_ONLY_ACCOUNT_PATHS = new Set([
  "/account",
  "/account/billing",
  "/account/data-privacy",
  "/account/members"
]);

const PERSONAL_ACCOUNT_PATHS = new Set(["/profile", "/settings", "/notifications"]);

export function isPersonalAccountPath(pathname: string): boolean {
  return PERSONAL_ACCOUNT_PATHS.has(pathname);
}

export function isOwnerOnlyAccountPath(pathname: string): boolean {
  if (pathname === "/account") return true;
  return OWNER_ONLY_ACCOUNT_PATHS.has(pathname);
}

export function canAccessAccountPath(
  session:
    | Partial<Pick<AuthSessionDto, "tenantRole" | "requiresWorkspaceSetup">>
    | null
    | undefined,
  pathname: string
): boolean {
  if (!canAccessAccountMode(session)) return false;
  if (session?.requiresWorkspaceSetup) {
    return (
      pathname === "/account/organization" ||
      pathname.startsWith("/account/workspaces") ||
      pathname === "/account/profile" ||
      pathname === "/account/settings" ||
      pathname === "/account/notifications"
    );
  }
  if (isPersonalAccountPath(pathname)) return true;
  if (isOrganizationOwner(session)) return true;
  return !isOwnerOnlyAccountPath(pathname);
}

export function defaultAccountLandingPath(
  session: Partial<Pick<AuthSessionDto, "tenantRole" | "requiresWorkspaceSetup">> | null | undefined
): string {
  if (session?.requiresWorkspaceSetup) {
    return "/account/workspaces?setup=required";
  }
  if (session?.tenantRole === "ADMIN") return "/account/workspaces";
  return "/account";
}
