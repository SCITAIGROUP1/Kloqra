import type { AuthSessionDto } from "@kloqra/contracts";
import {
  ACCOUNT_NAV_ITEMS,
  ORGANIZATION_ADMIN_NAV_ITEMS,
  ORGANIZATION_OWNER_NAV_ITEMS,
  type AccountNavItem
} from "@/config/account-nav";

export function resolveAccountNavItems(
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined
): readonly AccountNavItem[] {
  if (session?.tenantRole === "OWNER") return ORGANIZATION_OWNER_NAV_ITEMS;
  if (session?.tenantRole === "ADMIN") return ORGANIZATION_ADMIN_NAV_ITEMS;
  return ACCOUNT_NAV_ITEMS.filter((item) => !item.ownerOnly);
}
