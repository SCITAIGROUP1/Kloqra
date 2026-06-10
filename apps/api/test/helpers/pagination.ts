import { unwrapListItems, type PaginatedResponse } from "@kloqra/contracts";

/** Normalize list endpoints that return `{ items, page, ... }` in e2e tests. */
export function listItems<T>(body: T[] | PaginatedResponse<T>): T[] {
  return unwrapListItems(body);
}
