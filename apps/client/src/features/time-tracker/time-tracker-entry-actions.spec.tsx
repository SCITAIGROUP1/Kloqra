/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeTrackerEntryActions } from "./time-tracker-entry-actions";

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

afterEach(() => {
  cleanup();
});

describe("TimeTrackerEntryActions", () => {
  it("shows view-only action for locked entries", async () => {
    render(<TimeTrackerEntryActions log={log} locked onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Entry actions" }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "View" })).toBeTruthy();
    });
    expect(screen.queryByRole("menuitem", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull();
  });

  it("shows edit and delete actions for editable entries", async () => {
    render(
      <TimeTrackerEntryActions log={log} locked={false} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Entry actions" }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy();
    });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "View" })).toBeNull();
  });
});
