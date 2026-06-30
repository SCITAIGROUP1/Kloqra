import { describe, expect, it } from "vitest";
import { budgetBarColor } from "./budget-burndown-utils";

describe("budgetBarColor", () => {
  it("maps utilization to semantic bar classes", () => {
    expect(budgetBarColor(30)).toBe("bg-success");
    expect(budgetBarColor(75)).toBe("bg-warning");
    expect(budgetBarColor(100)).toBe("bg-destructive");
  });
});
