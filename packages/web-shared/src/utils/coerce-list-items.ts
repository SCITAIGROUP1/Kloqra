import { unwrapListItems, type PaginatedResponse } from "@kloqra/contracts";

/** Normalize list API payloads whether the backend returns a bare array or `{ items }`. */
export function coerceListItems<T>(value: T[] | PaginatedResponse<T> | null | undefined): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return unwrapListItems(value);
}
