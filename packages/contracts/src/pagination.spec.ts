import { describe, expect, it } from "vitest";
import { buildPaginationMeta, listPaginationQuerySchema, unwrapListItems } from "./pagination";

describe("pagination contracts", () => {
  it("defaults page and limit for list queries", () => {
    const parsed = listPaginationQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(1000);
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
});
