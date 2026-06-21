import { ROUTES } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";

describe("Bulk category import routes", () => {
  it("exposes bulk category import endpoints", () => {
    expect(ROUTES.CATEGORIES.BULK).toBe("/categories/bulk");
    expect(ROUTES.CATEGORIES.BULK_TEMPLATE).toBe("/categories/bulk/template");
    expect(ROUTES.CATEGORIES.BULK_UPLOAD).toBe("/categories/bulk/upload");
  });
});
