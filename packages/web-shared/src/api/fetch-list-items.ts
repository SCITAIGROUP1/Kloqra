import { MAX_LIST_LIMIT, type PaginatedResponse } from "@kloqra/contracts";
import { api } from "./client";
import { appendListQuery, buildListQuery } from "./list-query";

export async function fetchListItems<T>(
  path: string,
  options: {
    workspaceId: string;
    filters?: Record<string, string | undefined>;
    limit?: number;
  }
): Promise<T[]> {
  const query = buildListQuery({
    page: 1,
    limit: options.limit ?? MAX_LIST_LIMIT,
    filters: options.filters
  });
  const res = await api<PaginatedResponse<T>>(appendListQuery(path, query), {
    workspaceId: options.workspaceId
  });
  return res.items;
}

export async function fetchPaginatedList<T>(
  path: string,
  options: {
    workspaceId: string;
    page: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string | undefined>;
  }
): Promise<PaginatedResponse<T>> {
  const query = buildListQuery({
    page: options.page,
    limit: options.limit,
    search: options.search,
    filters: options.filters
  });
  return api<PaginatedResponse<T>>(appendListQuery(path, query), {
    workspaceId: options.workspaceId
  });
}
