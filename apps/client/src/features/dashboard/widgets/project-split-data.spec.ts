import type { ProjectDto, TaskDto, TimeLogDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { buildProjectDistributionData } from "./project-split-data";

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

function project(partial: Partial<ProjectDto> & Pick<ProjectDto, "id" | "name">): ProjectDto {
  return {
    workspaceId: "ws-1",
    color: "#236bfe",
    clientName: null,
    budgetHours: null,
    isActive: true,
    timesheetApprovalPeriod: null,
    ...partial
  };
}

function task(partial: Partial<TaskDto> & Pick<TaskDto, "id" | "projectId">): TaskDto {
  return {
    categoryId: "cat-1",
    taskName: "Task",
    categoryName: "Dev",
    billableDefault: true,
    isCommon: false,
    isActive: true,
    assignees: [],
    ...partial
  };
}

describe("buildProjectDistributionData", () => {
  it("aggregates hours by project with client name, percentage, and color", () => {
    const projects = [
      project({ id: "p1", name: "Alpha", clientName: "Acme Corp", color: "#236bfe" }),
      project({ id: "p2", name: "Beta", clientName: "Globex", color: "#16a34a" })
    ];
    const tasks = [task({ id: "t1", projectId: "p1" }), task({ id: "t2", projectId: "p2" })];
    const logs = [
      log({ id: "l1", taskId: "t1", durationSec: 7200 }),
      log({ id: "l2", taskId: "t2", durationSec: 3600 })
    ];

    const result = buildProjectDistributionData(logs, projects, tasks);

    expect(result.totalHours).toBe(3);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      id: "p1",
      projectName: "Alpha",
      clientName: "Acme Corp",
      hours: 2,
      percentage: 66.7,
      color: "#236bfe"
    });
    expect(result.rows[1]).toMatchObject({
      id: "p2",
      projectName: "Beta",
      clientName: "Globex",
      hours: 1,
      percentage: 33.3,
      color: "#16a34a"
    });
    expect(result.chartRows[0]?.value).toBe(2);
    expect(result.chartRows[0]?.configKey).toBe("project_0");
    expect(result.chartRows[0]?.fill).toMatch(/^#/);
  });

  it("sorts projects by hours descending", () => {
    const projects = [project({ id: "p1", name: "Small" }), project({ id: "p2", name: "Large" })];
    const tasks = [task({ id: "t1", projectId: "p1" }), task({ id: "t2", projectId: "p2" })];
    const logs = [
      log({ id: "l1", taskId: "t1", durationSec: 1800 }),
      log({ id: "l2", taskId: "t2", durationSec: 5400 })
    ];

    const { rows } = buildProjectDistributionData(logs, projects, tasks);

    expect(rows.map((row) => row.projectName)).toEqual(["Large", "Small"]);
  });

  it("returns empty chart rows when no logs exist", () => {
    const result = buildProjectDistributionData([], [], []);

    expect(result.totalHours).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.chartRows).toEqual([]);
  });
});
