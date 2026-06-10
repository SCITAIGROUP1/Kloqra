import { describe, expect, it } from "vitest";
import { normalizePaginatedListResponse } from "./fetch-list-items";

describe("normalizePaginatedListResponse", () => {
  it("unwraps legacy array list responses", () => {
    const normalized = normalizePaginatedListResponse([{ id: "p1" }], 1, 20);
    expect(normalized.items).toEqual([{ id: "p1" }]);
    expect(normalized.total).toBe(1);
  });

  it("unwraps paginated list responses", () => {
    const normalized = normalizePaginatedListResponse(
      { items: [{ id: "p2" }], page: 2, limit: 20, total: 45, totalPages: 3 },
      2,
      20
    );
    expect(normalized.items).toEqual([{ id: "p2" }]);
    expect(normalized.page).toBe(2);
    expect(normalized.totalPages).toBe(3);
  });

  it("defaults missing items to an empty array", () => {
    const normalized = normalizePaginatedListResponse(
      { page: 1, limit: 20, total: 0, totalPages: 0 },
      1,
      20
    );
    expect(normalized.items).toEqual([]);
  });
});
