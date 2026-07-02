import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { filterLoggingProjects, filterLoggingTasks } from "./logging-catalog-filters";

const projects: ProjectDto[] = [
  {
    id: "p-active",
    workspaceId: "ws-1",
    name: "Active",
    color: "#111",
    clientName: null,
    budgetHours: null,
    isActive: true,
    timesheetApprovalEnabled: false,
    timesheetApprovalPeriod: "weekly"
  },
  {
    id: "p-inactive",
    workspaceId: "ws-1",
    name: "Inactive",
    color: "#222",
    clientName: null,
    budgetHours: null,
    isActive: false,
    timesheetApprovalEnabled: false,
    timesheetApprovalPeriod: "weekly"
  }
];

const categories: CategoryDto[] = [
  {
    id: "c-active",
    workspaceId: "ws-1",
    name: "Active cat",
    description: null,
    isActive: true
  },
  {
    id: "c-inactive",
    workspaceId: "ws-1",
    name: "Inactive cat",
    description: null,
    isActive: false
  }
];

const tasks: TaskDto[] = [
  {
    id: "t-ok",
    projectId: "p-active",
    categoryId: "c-active",
    categoryName: "Active cat",
    taskName: "Loggable",
    billableDefault: true,
    isCommon: true,
    isActive: true,
    assignees: []
  },
  {
    id: "t-inactive-task",
    projectId: "p-active",
    categoryId: "c-active",
    categoryName: "Active cat",
    taskName: "Inactive task",
    billableDefault: true,
    isCommon: true,
    isActive: false,
    assignees: []
  },
  {
    id: "t-inactive-project",
    projectId: "p-inactive",
    categoryId: "c-active",
    categoryName: "Active cat",
    taskName: "Inactive project",
    billableDefault: true,
    isCommon: true,
    isActive: true,
    assignees: []
  },
  {
    id: "t-inactive-category",
    projectId: "p-active",
    categoryId: "c-inactive",
    categoryName: "Inactive cat",
    taskName: "Inactive category",
    billableDefault: true,
    isCommon: true,
    isActive: true,
    assignees: []
  }
];

describe("filterLoggingProjects", () => {
  it("keeps only active projects", () => {
    expect(filterLoggingProjects(projects).map((p) => p.id)).toEqual(["p-active"]);
  });
});

describe("filterLoggingTasks", () => {
  it("keeps only tasks with active project, category, and task", () => {
    expect(filterLoggingTasks(tasks, projects, categories).map((t) => t.id)).toEqual(["t-ok"]);
  });
});
