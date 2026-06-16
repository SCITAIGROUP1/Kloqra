import { z } from "zod";

export const DEFAULT_TABLE_PAGE_SIZE = 25;
export const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_DROPDOWN_LIST_LIMIT = 100;
export const MAX_LIST_LIMIT = 1000;

export const listPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).default(MAX_LIST_LIMIT),
  search: z.string().trim().min(1).max(200).optional()
});

export const paginatedResponseMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export function createPaginatedListResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return paginatedResponseMetaSchema.extend({
    items: z.array(itemSchema)
  });
}

export type ListPaginationQuery = z.infer<typeof listPaginationQuerySchema>;
export type PaginatedResponseMeta = z.infer<typeof paginatedResponseMetaSchema>;
export type PaginatedResponse<T> = PaginatedResponseMeta & { items: T[] };

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginatedResponseMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit)
  };
}

export function unwrapListItems<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.items;
}

export function tablePaginationQuery(
  page: number,
  search?: string,
  extra?: Record<string, string>,
  limit: number = DEFAULT_TABLE_PAGE_SIZE
) {
  const entries: [string, string][] = [
    ["page", String(page)],
    ["limit", String(limit)],
    ...(extra ? Object.entries(extra) : [])
  ];
  if (search?.trim()) entries.push(["search", search.trim()]);
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}
