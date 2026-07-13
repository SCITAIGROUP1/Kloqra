import { entityRowClassName, inactiveEntityRowClassName } from "./inactive-entity-row.js";

describe("entityRowClassName", () => {
  it("applies muted classes when inactive", () => {
    expect(entityRowClassName(false)).toBe(inactiveEntityRowClassName);
  });

  it("does not apply muted classes when active", () => {
    expect(entityRowClassName(true)).toBe("");
  });

  it("merges extra classes for inactive rows", () => {
    expect(entityRowClassName(false, "cursor-pointer")).toContain("cursor-pointer");
    expect(entityRowClassName(false, "cursor-pointer")).toContain("bg-muted/40");
  });

  it("passes through extra classes for active rows", () => {
    expect(entityRowClassName(true, "group cursor-pointer")).toBe("group cursor-pointer");
  });
});
