import { describe, expect, it } from "vitest";
import {
  buildProjectOverviewDistributionDonutData,
  buildProjectOverviewTaskBarData,
  formatOverviewHours
} from "./project-overview-chart-data";

describe("project overview chart data", () => {
  it("formats hours as a clock duration", () => {
    expect(formatOverviewHours(44.25)).toBe("44.25");
  });

  it("sorts task bar rows by total hours descending", () => {
    const rows = buildProjectOverviewTaskBarData([
      {
        taskId: "1",
        taskName: "Small",
        totalHours: 1,
        billableHours: 1
      },
      {
        taskId: "2",
        taskName: "Large",
        totalHours: 10,
        billableHours: 8
      }
    ]);

    expect(rows[0]?.name).toBe("Large");
    expect(rows[0]?.nonBillableHours).toBe(2);
  });

  it("maps category rows to donut chart data", () => {
    const rows = buildProjectOverviewDistributionDonutData(
      {
        projectId: "p1",
        projectName: "Website",
        period: { from: "2026-06-01T00:00:00.000Z", to: "2026-06-30T23:59:59.999Z" },
        totalHours: 5,
        billableHours: 5,
        nonBillableHours: 0,
        entryCount: 1,
        byTask: [],
        byCategory: [
          {
            categoryId: "c1",
            categoryName: "DevOps",
            totalHours: 5,
            billableHours: 5
          }
        ],
        byMember: []
      },
      "category"
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("DevOps");
    expect(rows[0]?.value).toBe(5);
  });

  it("builds member distribution rows from summary", () => {
    const rows = buildProjectOverviewDistributionDonutData(
      {
        projectId: "p1",
        projectName: "Website",
        period: { from: "2026-06-01T00:00:00.000Z", to: "2026-06-30T23:59:59.999Z" },
        totalHours: 8,
        billableHours: 8,
        nonBillableHours: 0,
        entryCount: 2,
        byTask: [],
        byCategory: [],
        byMember: [
          {
            userId: "u1",
            userName: "Sam Rivera",
            totalHours: 8,
            billableHours: 8
          }
        ]
      },
      "member"
    );

    expect(rows[0]?.name).toBe("Sam Rivera");
  });
});
