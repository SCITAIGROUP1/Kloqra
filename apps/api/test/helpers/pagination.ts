import type { PaginatedResponse } from "@kloqra/contracts";

/** Normalize list endpoints that return `{ items, page, ... }` in e2e tests. */
export function listItems<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (
    body &&
    typeof body === "object" &&
    "items" in body &&
    Array.isArray((body as PaginatedResponse<T>).items)
  ) {
    return (body as PaginatedResponse<T>).items;
  }
  return [];
}
