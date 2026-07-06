/** @vitest-environment jsdom */
import type { ProjectDto, TaskDto, TimeLogDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeTrackerEntryRow } from "./time-tracker-entry-row";

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

const task: TaskDto = {
  id: "task-1",
  projectId: "proj-1",
  categoryId: "cat-1",
  taskName: "Code review",
  billableDefault: true,
  isCommon: true,
  isActive: true,
  assignees: []
};

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

function renderRow(locked: boolean) {
  return render(
    <table>
      <tbody>
        <TimeTrackerEntryRow
          log={log}
          task={task}
          project={project}
          projectName="Acme"
          entryColor="#000"
          submissionByKey={new Map()}
          locked={locked}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          timezone="UTC"
        />
      </tbody>
    </table>
  );
}

afterEach(() => {
  cleanup();
});

describe("TimeTrackerEntryRow", () => {
  it("shows view-only action for locked entries", async () => {
    renderRow(true);
    fireEvent.click(screen.getByRole("button", { name: "Entry actions" }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "View" })).toBeTruthy();
    });
    expect(screen.queryByRole("menuitem", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull();
  });

  it("shows edit and delete actions for editable entries", async () => {
    renderRow(false);
    fireEvent.click(screen.getByRole("button", { name: "Entry actions" }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy();
    });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "View" })).toBeNull();
  });
});
