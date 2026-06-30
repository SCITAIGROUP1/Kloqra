import { describe, expect, it } from "vitest";
import { coerceListItems } from "./coerce-list-items";

describe("coerceListItems", () => {
  it("returns arrays unchanged", () => {
    expect(coerceListItems([{ id: "1" }])).toEqual([{ id: "1" }]);
  });

  it("unwraps paginated payloads", () => {
    expect(
      coerceListItems({
        items: [{ id: "2" }],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      })
    ).toEqual([{ id: "2" }]);
  });

  it("returns an empty array for nullish values", () => {
    expect(coerceListItems(null)).toEqual([]);
    expect(coerceListItems(undefined)).toEqual([]);
  });
});
