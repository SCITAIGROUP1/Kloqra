import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimeEntryAuditEventList } from "./time-entry-audit-trail.js";

describe("TimeEntryAuditEventList", () => {
  it("describes task changes with project and task names", () => {
    render(
      <TimeEntryAuditEventList
        events={[
          {
            id: "evt-1",
            actorName: "Sam Rivera",
            action: "UPDATE",
            before: {
              startTime: "2026-06-01T09:00:00.000Z",
              endTime: "2026-06-01T10:00:00.000Z",
              isBillable: true,
              description: null,
              taskId: "task-a"
            },
            after: {
              startTime: "2026-06-01T09:00:00.000Z",
              endTime: "2026-06-01T10:00:00.000Z",
              isBillable: true,
              description: null,
              taskId: "task-b"
            },
            createdAt: "2026-06-01T10:05:00.000Z"
          }
        ]}
        tasks={[
          { id: "task-a", taskName: "Design", projectId: "project-a" },
          { id: "task-b", taskName: "Build", projectId: "project-b" }
        ]}
        projects={[
          { id: "project-a", name: "Portal" },
          { id: "project-b", name: "Audit" }
        ]}
      />
    );

    expect(screen.getByText("Sam Rivera")).toBeInTheDocument();
    expect(screen.getByText(/moved project: Portal → Audit/i)).toBeInTheDocument();
  });

  it("renders empty state when there are no events", () => {
    render(<TimeEntryAuditEventList events={[]} emptyMessage="No audit history." />);
    expect(screen.getByText("No audit history.")).toBeInTheDocument();
  });
});
