import type { AccountNavItem } from "@/config/account-nav";
import { ACCOUNT_NAV_ITEMS } from "@/config/account-nav";
import type { AdminNavItem } from "@/config/admin-nav";
import { ADMIN_NAV_ITEMS } from "@/config/admin-nav";

export type GlobalSearchResultType = "page" | "project" | "task" | "category" | "person";

export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  label: string;
  subtitle?: string;
  href: string;
};

export type GlobalSearchViewAll = {
  type: Exclude<GlobalSearchResultType, "page">;
  label: string;
  href: string;
};

export const GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2;
export const GLOBAL_SEARCH_RESULT_LIMIT = 5;
export const GLOBAL_SEARCH_DEBOUNCE_MS = 300;

export function filterAdminNavItems(
  query: string,
  options?: { includeAccount?: boolean }
): AdminNavItem[] {
  const normalized = query.trim().toLowerCase();
  const pool: (AdminNavItem | AccountNavItem)[] = options?.includeAccount
    ? [...ADMIN_NAV_ITEMS, ...ACCOUNT_NAV_ITEMS]
    : [...ADMIN_NAV_ITEMS];

  if (!normalized) return pool as AdminNavItem[];

  return pool.filter((item) => {
    if (item.label.toLowerCase().includes(normalized)) return true;
    const keywords = "keywords" in item ? item.keywords : undefined;
    return keywords?.some((keyword) => keyword.toLowerCase().includes(normalized)) ?? false;
  }) as AdminNavItem[];
}

export function toPageSearchResult(item: AdminNavItem): GlobalSearchResult {
  return {
    id: `page:${item.href}`,
    type: "page",
    label: item.label,
    href: item.href
  };
}
