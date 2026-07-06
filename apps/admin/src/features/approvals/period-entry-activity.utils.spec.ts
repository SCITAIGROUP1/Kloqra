import { describe, expect, it } from "vitest";
import {
  filterLogsForProject,
  formatEntryDuration,
  mergeAuditEvents,
  sortLogsByStartDesc
} from "./period-entry-activity.utils";

describe("period-entry-activity.utils", () => {
  it("filters logs to the pending submission project", () => {
    const logs = [
      {
        id: "log-1",
        userId: "user-1",
        taskId: "task-a",
        startTime: "2026-06-01T09:00:00.000Z",
        endTime: "2026-06-01T10:00:00.000Z",
        durationSec: 3600,
        description: null,
        isBillable: true,
        source: "manual" as const
      },
      {
        id: "log-2",
        userId: "user-1",
        taskId: "task-b",
        startTime: "2026-06-02T09:00:00.000Z",
        endTime: "2026-06-02T10:00:00.000Z",
        durationSec: 3600,
        description: null,
        isBillable: true,
        source: "manual" as const
      }
    ];

    const tasks = [
      {
        id: "task-a",
        projectId: "project-a",
        categoryId: "category-a",
        taskName: "Design",
        billableDefault: true,
        isCommon: false,
        isActive: true,
        assignees: [{ userId: "user-1", userName: "Sam Rivera" }]
      },
      {
        id: "task-b",
        projectId: "project-b",
        categoryId: "category-b",
        taskName: "Support",
        billableDefault: true,
        isCommon: false,
        isActive: true,
        assignees: [{ userId: "user-1", userName: "Sam Rivera" }]
      }
    ];

    expect(filterLogsForProject(logs, "project-a", tasks)).toHaveLength(1);
    expect(filterLogsForProject(logs, "project-a", tasks)[0]?.id).toBe("log-1");
  });

  it("merges audit events newest first", () => {
    const merged = mergeAuditEvents([
      [
        {
          id: "a1",
          actorName: "Sam",
          action: "CREATE",
          before: null,
          after: {
            startTime: "2026-06-01T09:00:00.000Z",
            endTime: "2026-06-01T10:00:00.000Z",
            isBillable: true,
            description: null,
            taskId: "task-a"
          },
          createdAt: "2026-06-01T10:00:00.000Z"
        }
      ],
      [
        {
          id: "b1",
          actorName: "Sam",
          action: "UPDATE",
          before: {
            startTime: "2026-06-02T09:00:00.000Z",
            endTime: "2026-06-02T10:00:00.000Z",
            isBillable: true,
            description: null,
            taskId: "task-a"
          },
          after: {
            startTime: "2026-06-02T09:30:00.000Z",
            endTime: "2026-06-02T10:30:00.000Z",
            isBillable: true,
            description: null,
            taskId: "task-a"
          },
          createdAt: "2026-06-03T10:00:00.000Z"
        }
      ]
    ]);

    expect(merged.map((event) => event.id)).toEqual(["b1", "a1"]);
  });

  it("formats entry duration and sorts logs by start time", () => {
    expect(formatEntryDuration(5400)).toBe("1h 30m");

    const sorted = sortLogsByStartDesc([
      {
        id: "log-1",
        userId: "user-1",
        taskId: "task-a",
        startTime: "2026-06-01T09:00:00.000Z",
        endTime: "2026-06-01T10:00:00.000Z",
        durationSec: 3600,
        description: null,
        isBillable: true,
        source: "manual"
      },
      {
        id: "log-2",
        userId: "user-1",
        taskId: "task-a",
        startTime: "2026-06-03T09:00:00.000Z",
        endTime: "2026-06-03T10:00:00.000Z",
        durationSec: 3600,
        description: null,
        isBillable: true,
        source: "manual"
      }
    ]);

    expect(sorted.map((log) => log.id)).toEqual(["log-2", "log-1"]);
  });
});
