import {
  DEFAULT_DROPDOWN_LIST_LIMIT,
  DEFAULT_TABLE_PAGE_SIZE,
  buildPaginationMeta,
  type PaginatedResponse
} from "@kloqra/contracts";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { getAccessToken, useSessionStore } from "../stores/session.store";
import { api } from "./client";
import {
  buildListCacheKey,
  getCachedListItems,
  invalidateListItemsCache,
  setCachedListItems
} from "./list-items-cache";
import { appendListQuery, buildListQuery } from "./list-query";

type ListApiResponse<T> = T[] | PaginatedResponse<T>;

export { invalidateListItemsCache } from "./list-items-cache";

function resolveListCacheUserId(): string {
  const sessionUserId = useSessionStore.getState().session?.user?.id;
  if (sessionUserId) return sessionUserId;
  return readUserIdFromToken(getAccessToken()) ?? "anonymous";
}

/** @deprecated Use invalidateListItemsCache() */
export function clearListItemsCache() {
  invalidateListItemsCache();
}

export function normalizePaginatedListResponse<T>(
  data: ListApiResponse<T>,
  page: number,
  limit: number
): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    const total = data.length;
    return { items: data, ...buildPaginationMeta(total, page, limit) };
  }
  const items = data.items ?? [];
  const total = data.total ?? items.length;
  return {
    items,
    page: data.page ?? page,
    limit: data.limit ?? limit,
    total,
    totalPages: data.totalPages ?? buildPaginationMeta(total, page, limit).totalPages
  };
}

export async function fetchListItems<T>(
  path: string,
  options: {
    workspaceId: string;
    filters?: Record<string, string | string[] | number | boolean | undefined | null>;
    limit?: number;
    bypassCache?: boolean;
  }
): Promise<T[]> {
  const limit = options.limit ?? DEFAULT_DROPDOWN_LIST_LIMIT;
  const userId = resolveListCacheUserId();
  const cacheKey = buildListCacheKey(path, options.workspaceId, userId, options.filters, limit);

  if (!options.bypassCache) {
    const cached = getCachedListItems(cacheKey);
    if (cached) return cached as T[];
  }

  const query = buildListQuery({
    page: 1,
    limit,
    filters: options.filters
  });
  const res = await api<ListApiResponse<T>>(appendListQuery(path, query), {
    workspaceId: options.workspaceId
  });
  const items = normalizePaginatedListResponse(res, 1, limit).items;
  setCachedListItems(cacheKey, items);
  return items;
}

export async function fetchPaginatedList<T>(
  path: string,
  options: {
    workspaceId: string;
    page: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string | string[] | number | boolean | undefined | null>;
  }
): Promise<PaginatedResponse<T>> {
  const limit = options.limit ?? DEFAULT_TABLE_PAGE_SIZE;
  const query = buildListQuery({
    page: options.page,
    limit,
    search: options.search,
    filters: options.filters
  });
  const res = await api<ListApiResponse<T>>(appendListQuery(path, query), {
    workspaceId: options.workspaceId
  });
  return normalizePaginatedListResponse(res, options.page, limit);
}
