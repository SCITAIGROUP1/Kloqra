import { DEFAULT_TABLE_PAGE_SIZE, MAX_LIST_LIMIT } from "@kloqra/contracts";

export function buildListQuery(params: {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, string | number | boolean | undefined | null>;
}) {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? MAX_LIST_LIMIT));
  if (params.search?.trim()) qs.set("search", params.search.trim());
  for (const [key, value] of Object.entries(params.filters ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  }
  return qs.toString();
}

export function buildTableQuery(
  page: number,
  search?: string,
  filters?: Record<string, string | undefined>
) {
  return buildListQuery({ page, limit: DEFAULT_TABLE_PAGE_SIZE, search, filters });
}

export function appendListQuery(path: string, query: string) {
  return query ? `${path}?${query}` : path;
}
