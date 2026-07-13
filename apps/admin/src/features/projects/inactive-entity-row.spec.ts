import { entityRowClassName, inactiveEntityRowClassName } from "@kloqra/ui";
import { describe, expect, it } from "vitest";

/** Contract: admin project/category/task lists use the shared inactive row classes. */
describe("entityRowClassName (admin lists)", () => {
  it("mutes inactive entity rows", () => {
    expect(entityRowClassName(false)).toBe(inactiveEntityRowClassName);
    expect(inactiveEntityRowClassName).toContain("bg-muted/40");
    expect(inactiveEntityRowClassName).toContain("text-muted-foreground");
  });

  it("merges clickable extras used by the projects list", () => {
    const classes = entityRowClassName(false, "group cursor-pointer");
    expect(classes).toContain("group");
    expect(classes).toContain("cursor-pointer");
    expect(classes).toContain("bg-muted/40");
  });

  it("leaves active rows unstyled by the helper", () => {
    expect(entityRowClassName(true, "group cursor-pointer")).toBe("group cursor-pointer");
  });
});
