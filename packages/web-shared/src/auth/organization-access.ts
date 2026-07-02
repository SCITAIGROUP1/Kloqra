import type { AuthSessionDto } from "@kloqra/contracts";

/** Organization owner or organization admin (tenant ADMIN). */
export function canManageOrganization(
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined
): boolean {
  return session?.tenantRole === "OWNER" || session?.tenantRole === "ADMIN";
}

export function isOrganizationOwner(
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined
): boolean {
  return session?.tenantRole === "OWNER";
}

export function canAccessAccountMode(
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined
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
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined,
  pathname: string
): boolean {
  if (!canAccessAccountMode(session)) return false;
  if (isPersonalAccountPath(pathname)) return true;
  if (isOrganizationOwner(session)) return true;
  return !isOwnerOnlyAccountPath(pathname);
}

export function defaultAccountLandingPath(
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined
): string {
  if (session?.tenantRole === "ADMIN") return "/account/workspaces";
  return "/account";
}
