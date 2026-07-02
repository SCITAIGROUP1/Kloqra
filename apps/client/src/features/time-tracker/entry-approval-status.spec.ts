import type {
  CategoryDto,
  ProjectDto,
  TaskDto,
  TimeLogDto,
  TimesheetPeriodDto
} from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  INACTIVE_CATEGORY_MESSAGE,
  INACTIVE_PROJECT_MESSAGE,
  INACTIVE_TASK_MESSAGE,
  buildSubmissionByKey,
  isTimeEntryLocked,
  isTimeEntryReadOnly,
  messageForFreezeReason,
  resolveInactiveFreezeReason,
  resolveTimeEntryFreezeReason,
  resolveEntryApprovalStatus
} from "./entry-approval-status";

const project: ProjectDto = {
  id: "proj-1",
  workspaceId: "ws-1",
  name: "Acme",
  color: "#000",
  clientName: null,
  budgetHours: null,
  isActive: true,
  timesheetApprovalEnabled: true,
  timesheetApprovalPeriod: "weekly"
};

const category: CategoryDto = {
  id: "cat-1",
  workspaceId: "ws-1",
  name: "Development",
  description: null,
  isActive: true
};

const task: TaskDto = {
  id: "task-1",
  projectId: "proj-1",
  categoryId: "cat-1",
  categoryName: "Development",
  taskName: "Code review",
  billableDefault: true,
  isCommon: true,
  isActive: true,
  assignees: []
};

const log: TimeLogDto = {
  id: "log-1",
  userId: "user-1",
  taskId: "task-1",
  startTime: "2026-06-09T13:04:00.000Z",
  endTime: "2026-06-09T14:04:00.000Z",
  durationSec: 3600,
  description: "Code review",
  isBillable: true,
  source: "manual"
};

const submittedPeriod: TimesheetPeriodDto = {
  id: "period-1",
  userId: "user-1",
  workspaceId: "ws-1",
  projectId: "proj-1",
  periodStart: "2026-06-09T00:00:00.000Z",
  periodEnd: "2026-06-15T23:59:59.999Z",
  approvalPeriod: "weekly",
  status: "SUBMITTED",
  note: null,
  reviewNote: null,
  reviewedBy: null,
  reviewedAt: null,
  submittedAt: "2026-06-10T00:00:00.000Z"
};

describe("isTimeEntryLocked", () => {
  it("returns true when the entry falls in a submitted period", () => {
    const submissionByKey = new Map([["proj-1:2026-06-09T00:00:00.000Z", submittedPeriod]]);

    expect(isTimeEntryLocked(log, project, submissionByKey)).toBe(true);
    expect(resolveEntryApprovalStatus(log, project, submissionByKey).status).toBe("SUBMITTED");
  });

  it("returns false when approval is disabled on the project", () => {
    const submissionByKey = new Map([["proj-1:2026-06-09T00:00:00.000Z", submittedPeriod]]);

    expect(
      isTimeEntryLocked(log, { ...project, timesheetApprovalEnabled: false }, submissionByKey)
    ).toBe(false);
  });

  it("returns false when the period is still draft", () => {
    const submissionByKey = new Map([
      [
        "proj-1:2026-06-09T00:00:00.000Z",
        { ...submittedPeriod, status: "DRAFT" as const, submittedAt: null }
      ]
    ]);

    expect(isTimeEntryLocked(log, project, submissionByKey)).toBe(false);
  });
});

describe("resolveInactiveFreezeReason", () => {
  it("prioritizes project over category and task", () => {
    expect(
      resolveInactiveFreezeReason(
        { ...project, isActive: false },
        { ...task, isActive: false },
        { ...category, isActive: false }
      )
    ).toBe("project");
  });

  it("returns category when only category is inactive", () => {
    expect(resolveInactiveFreezeReason(project, task, { ...category, isActive: false })).toBe(
      "category"
    );
  });

  it("returns task when only task is inactive", () => {
    expect(resolveInactiveFreezeReason(project, { ...task, isActive: false }, category)).toBe(
      "task"
    );
  });
});

describe("isTimeEntryReadOnly", () => {
  const submissionByKey = new Map<string, TimesheetPeriodDto>();

  it("returns true when project is inactive", () => {
    expect(
      isTimeEntryReadOnly(log, { ...project, isActive: false }, task, category, submissionByKey)
    ).toBe(true);
    expect(
      resolveTimeEntryFreezeReason(
        log,
        { ...project, isActive: false },
        task,
        category,
        submissionByKey
      )
    ).toBe("project");
  });

  it("returns true when category is inactive", () => {
    expect(
      isTimeEntryReadOnly(log, project, task, { ...category, isActive: false }, submissionByKey)
    ).toBe(true);
  });

  it("returns true when task is inactive", () => {
    expect(
      isTimeEntryReadOnly(log, project, { ...task, isActive: false }, category, submissionByKey)
    ).toBe(true);
  });

  it("returns true when entry is approval-locked", () => {
    const lockedSubmissions = new Map([["proj-1:2026-06-09T00:00:00.000Z", submittedPeriod]]);
    expect(isTimeEntryReadOnly(log, project, task, category, lockedSubmissions)).toBe(true);
    expect(resolveTimeEntryFreezeReason(log, project, task, category, lockedSubmissions)).toBe(
      "approval"
    );
  });

  it("returns false when all entities are active and period is draft", () => {
    expect(isTimeEntryReadOnly(log, project, task, category, submissionByKey)).toBe(false);
  });
});

describe("messageForFreezeReason", () => {
  it("returns inactive entity messages", () => {
    expect(messageForFreezeReason("project")).toBe(INACTIVE_PROJECT_MESSAGE);
    expect(messageForFreezeReason("category")).toBe(INACTIVE_CATEGORY_MESSAGE);
    expect(messageForFreezeReason("task")).toBe(INACTIVE_TASK_MESSAGE);
  });
});

describe("buildSubmissionByKey", () => {
  it("indexes submissions by project and period start", () => {
    const map = buildSubmissionByKey([submittedPeriod]);
    expect(map.get("proj-1:2026-06-09T00:00:00.000Z")).toEqual(submittedPeriod);
  });
});
