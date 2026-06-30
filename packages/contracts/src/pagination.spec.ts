import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  buildPaginationMeta,
  createPaginatedListResponseSchema,
  DEFAULT_TABLE_PAGE_SIZE,
  listPaginationQuerySchema,
  TABLE_PAGE_SIZE_OPTIONS,
  tablePaginationQuery,
  unwrapListItems
} from "./pagination";

describe("pagination contracts", () => {
  it("defaults page and limit for list queries", () => {
    const parsed = listPaginationQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(1000);
  });

  it("exposes table page size options", () => {
    expect(TABLE_PAGE_SIZE_OPTIONS).toEqual([10, 25, 50]);
    expect(DEFAULT_TABLE_PAGE_SIZE).toBe(25);
  });

  it("builds pagination meta", () => {
    expect(buildPaginationMeta(45, 2, 20)).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3
    });
  });

  it("unwraps paginated and legacy array responses", () => {
    expect(unwrapListItems([{ id: "1" }])).toEqual([{ id: "1" }]);
    expect(
      unwrapListItems({
        items: [{ id: "2" }],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      })
    ).toEqual([{ id: "2" }]);
  });

  it("returns zero total pages when there are no rows", () => {
    expect(buildPaginationMeta(0, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    });
  });

  it("builds table pagination query strings", () => {
    expect(tablePaginationQuery(2)).toBe(`page=2&limit=${DEFAULT_TABLE_PAGE_SIZE}`);
    expect(tablePaginationQuery(1, "  acme  ", { sort: "name" })).toBe(
      `page=1&limit=${DEFAULT_TABLE_PAGE_SIZE}&sort=name&search=acme`
    );
    expect(tablePaginationQuery(1, undefined, undefined, 25)).toBe("page=1&limit=25");
  });

  it("wraps item schemas in paginated list responses", () => {
    const schema = createPaginatedListResponseSchema(z.object({ id: z.string() }));
    const parsed = schema.parse({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      items: [{ id: "1" }]
    });
    expect(parsed.items).toEqual([{ id: "1" }]);
  });
});
