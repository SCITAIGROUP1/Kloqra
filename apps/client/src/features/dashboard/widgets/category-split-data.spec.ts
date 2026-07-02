import type { TaskDto, TimeLogDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { buildCategorySplitData, categorySplitPeriodLabel } from "./category-split-data";

function log(
  partial: Partial<TimeLogDto> & Pick<TimeLogDto, "taskId" | "durationSec">
): TimeLogDto {
  return {
    id: partial.id ?? "log-1",
    userId: "user-1",
    taskId: partial.taskId,
    startTime: partial.startTime ?? "2026-06-10T10:00:00.000Z",
    endTime: partial.endTime ?? "2026-06-10T11:00:00.000Z",
    durationSec: partial.durationSec,
    description: partial.description ?? null,
    isBillable: partial.isBillable ?? true,
    source: partial.source ?? "manual"
  };
}

function task(partial: Partial<TaskDto> & Pick<TaskDto, "id" | "projectId">): TaskDto {
  return {
    categoryId: partial.categoryId ?? "cat-1",
    taskName: partial.taskName ?? "Task",
    categoryName: partial.categoryName ?? "Development",
    billableDefault: true,
    isCommon: false,
    isActive: true,
    assignees: [],
    ...partial
  };
}

describe("buildCategorySplitData", () => {
  it("aggregates hours by category from logs", () => {
    const tasks = [
      task({ id: "t1", projectId: "p1", categoryId: "c1", categoryName: "Development" }),
      task({ id: "t2", projectId: "p1", categoryId: "c2", categoryName: "Documentation" })
    ];
    const logs = [
      log({ id: "l1", taskId: "t1", durationSec: 7200 }),
      log({ id: "l2", taskId: "t2", durationSec: 3600 })
    ];

    const result = buildCategorySplitData(logs, tasks);

    expect(result.totalHours).toBe(3);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      categoryName: "Development",
      hours: 2,
      percentage: 66.7
    });
    expect(result.rows[1]).toMatchObject({
      categoryName: "Documentation",
      hours: 1,
      percentage: 33.3
    });
    expect(result.chartRows[0]?.configKey).toBe("category_0");
    expect(result.chartRows[0]?.fill).toMatch(/^(#|hsl\()/);
  });

  it("returns empty data when no logs exist", () => {
    const result = buildCategorySplitData([], []);

    expect(result.totalHours).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.chartRows).toEqual([]);
  });
});

describe("categorySplitPeriodLabel", () => {
  it("maps dashboard range presets to labels", () => {
    expect(categorySplitPeriodLabel("today")).toBe("Today");
    expect(categorySplitPeriodLabel("week")).toBe("This week");
    expect(categorySplitPeriodLabel("month")).toBe("This month");
    expect(categorySplitPeriodLabel("custom")).toBe("Period");
  });
});
