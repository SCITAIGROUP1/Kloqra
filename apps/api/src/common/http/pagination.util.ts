import { buildPaginationMeta, type PaginatedResponseMeta } from "@kloqra/contracts";

export function paginationSkipTake(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit
  };
}

export function toPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponseMeta & { items: T[] } {
  return {
    items,
    ...buildPaginationMeta(total, page, limit)
  };
}

export function emptyPaginatedResponse<T>(page: number, limit: number) {
  return toPaginatedResponse<T>([], 0, page, limit);
}
