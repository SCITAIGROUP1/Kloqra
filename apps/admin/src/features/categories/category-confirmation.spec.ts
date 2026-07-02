import { describe, expect, it } from "vitest";
import {
  getActivateCategoryConfirmation,
  getDeactivateCategoryConfirmation,
  getDeleteCategoryConfirmation
} from "./category-confirmation";

describe("category confirmation copy", () => {
  it("describes delete with uncategorized fallback", () => {
    const confirmation = getDeleteCategoryConfirmation("Development");
    expect(confirmation.title).toBe("Delete category?");
    expect(confirmation.description).toContain("Development");
    expect(confirmation.description).toContain("Uncategorized");
    expect(confirmation.destructive).toBe(true);
    expect(confirmation.confirmLabel).toBe("Delete");
  });

  it("describes deactivate impact on logging and entries", () => {
    const confirmation = getDeactivateCategoryConfirmation("Design");
    expect(confirmation.title).toBe("Deactivate category?");
    expect(confirmation.description).toContain("Design");
    expect(confirmation.description).toContain("read-only");
    expect(confirmation.destructive).toBe(true);
  });

  it("describes activate restoring loggability", () => {
    const confirmation = getActivateCategoryConfirmation("QA");
    expect(confirmation.title).toBe("Activate category?");
    expect(confirmation.description).toContain("QA");
    expect(confirmation.description).toContain("loggable");
  });
});
