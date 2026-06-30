import { describe, expect, it } from "vitest";
import { buildWidgetShareDateRange, widgetShareOptionsForId } from "./widget-share-utils";

describe("widgetShareOptionsForId", () => {
  it("maps widget-specific options", () => {
    expect(
      widgetShareOptionsForId("daily_chart", {
        dailyChartBy: "project",
        breakdownGroupBy: "user",
        distributionGroupBy: "user"
      })
    ).toEqual({ chartBy: "project" });

    expect(
      widgetShareOptionsForId("distribution_donut", {
        dailyChartBy: "billability",
        breakdownGroupBy: "user",
        distributionGroupBy: "category"
      })
    ).toEqual({ groupBy: "category" });
  });

  it("builds ISO date range from date inputs", () => {
    const range = buildWidgetShareDateRange("2025-01-01", "2025-01-31");
    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(range.to).getTime()).toBeGreaterThan(new Date(range.from).getTime());
  });
});
