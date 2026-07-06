/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeEntryDialog } from "./time-entry-dialog";
import type { TimeEntryDraft } from "./time-entry-draft";

vi.mock("@/hooks/use-live-entry-catalog", () => ({
  useLiveEntryCatalog: vi.fn()
}));

const draft: TimeEntryDraft = {
  date: "2026-06-09",
  projectId: "proj-1",
  taskSelection: "task-1",
  startTime: "13:04",
  endTime: "14:04",
  description: "Code review",
  isBillable: true
};

const editingLog: TimeLogDto = {
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

afterEach(() => {
  cleanup();
});

describe("TimeEntryDialog", () => {
  it("hides save and delete actions when read-only", async () => {
    render(
      <TimeEntryDialog
        open
        title="Edit time entry"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        editingLog={editingLog}
        readOnly
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/locked \(submitted or approved\)/i)).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete entry" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Close" }).length).toBeGreaterThan(0);
  });

  it("renders server validation errors inline under fields", async () => {
    render(
      <TimeEntryDialog
        open
        title="Edit time entry"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        editingLog={editingLog}
        workspaceId="ws-1"
        error="Validation failed — Project Id is required; Task Selection is required; Start Time is required; End Time is required; Description is required"
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/project id is required/i)).toBeTruthy();
      expect(screen.getByText(/task selection is required/i)).toBeTruthy();
      expect(screen.getByText(/start time is required/i)).toBeTruthy();
      expect(screen.getByText(/end time is required/i)).toBeTruthy();
      expect(screen.getByText(/description is required/i)).toBeTruthy();
    });
  });

  it("renders When row with entry date picker", async () => {
    render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("When")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Entry date" })).toBeTruthy();
      expect(screen.getByLabelText("Start time")).toBeTruthy();
      expect(screen.getByLabelText("End time")).toBeTruthy();
    });
  });

  it("shows repeat affordance on create but not on edit", async () => {
    const { rerender } = render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Repeat on more days" })).toBeTruthy();
    });

    rerender(
      <TimeEntryDialog
        open
        title="Edit time entry"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        editingLog={editingLog}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "+ Repeat on more days" })).toBeNull();
  });

  it("opens repeat panel and patches draft when repeat affordance is clicked", () => {
    const onDraftChange = vi.fn();
    render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={onDraftChange}
        onSave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Repeat on more days" }));

    expect(onDraftChange).toHaveBeenCalledWith({
      ...draft,
      recurrence: "weekdays",
      repeatUntil: "2026-06-09"
    });
  });
});
