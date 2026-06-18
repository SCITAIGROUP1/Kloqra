const LIST_CACHE_TTL_MS = 30_000;

type CacheEntry = { expiresAt: number; items: unknown[] };

const listCache = new Map<string, CacheEntry>();

export function buildListCacheKey(
  path: string,
  workspaceId: string,
  filters: Record<string, string | string[] | number | boolean | undefined | null> | undefined,
  limit: number
) {
  const filterKey = filters
    ? Object.keys(filters)
        .sort()
        .map((key) => {
          const val = filters[key];
          const valStr = Array.isArray(val) ? val.join(",") : (val ?? "");
          return `${key}=${valStr}`;
        })
        .join("&")
    : "";
  return `${workspaceId}:${path}:${limit}:${filterKey}`;
}

export function getCachedListItems(cacheKey: string): unknown[] | null {
  const cached = listCache.get(cacheKey);
  if (!cached || cached.expiresAt <= Date.now()) {
    if (cached) listCache.delete(cacheKey);
    return null;
  }
  return cached.items;
}

export function setCachedListItems(cacheKey: string, items: unknown[]) {
  listCache.set(cacheKey, { items, expiresAt: Date.now() + LIST_CACHE_TTL_MS });
}

export type InvalidateListItemsCacheScope = {
  workspaceId?: string;
  path?: string;
};

/** Drop cached dropdown/list fetches after mutations or when forcing a refresh. */
export function invalidateListItemsCache(scope?: InvalidateListItemsCacheScope) {
  if (!scope?.workspaceId && !scope?.path) {
    listCache.clear();
    return;
  }

  for (const key of [...listCache.keys()]) {
    if (scope.workspaceId && !key.startsWith(`${scope.workspaceId}:`)) continue;
    if (scope.path && !key.includes(`:${scope.path}:`)) continue;
    listCache.delete(key);
  }
}
