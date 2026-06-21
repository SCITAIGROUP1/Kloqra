/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepeatEntryPanel } from "./repeat-entry-panel";
import type { TimeEntryDraft } from "./time-entry-draft";

const baseDraft: TimeEntryDraft = {
  date: "2026-06-09",
  projectId: "proj-1",
  taskSelection: "task-1",
  startTime: "09:00",
  endTime: "10:00",
  description: "",
  isBillable: true,
  recurrence: "none",
  repeatUntil: "2026-06-09"
};

afterEach(() => {
  cleanup();
});

describe("RepeatEntryPanel", () => {
  it("renders nothing when closed and not recurring", () => {
    const { container } = render(
      <RepeatEntryPanel open={false} draft={baseDraft} onPatch={vi.fn()} onOpenChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows pattern pills when open", () => {
    render(
      <RepeatEntryPanel
        open
        draft={{ ...baseDraft, recurrence: "weekdays", repeatUntil: "2026-06-13" }}
        onPatch={vi.fn()}
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.getByText("Repeat")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Daily" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Weekdays" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Weekly" })).toBeTruthy();
    expect(screen.getByText(/~4 entries/i)).toBeTruthy();
  });

  it("calls onPatch when selecting a pattern", () => {
    const onPatch = vi.fn();
    render(
      <RepeatEntryPanel
        open
        draft={{ ...baseDraft, recurrence: "weekdays", repeatUntil: "2026-06-13" }}
        onPatch={onPatch}
        onOpenChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Daily" }));
    expect(onPatch).toHaveBeenCalledWith({
      recurrence: "daily",
      repeatUntil: "2026-06-13"
    });
  });

  it("resets recurrence when removing repeat", () => {
    const onPatch = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <RepeatEntryPanel
        open
        draft={{ ...baseDraft, recurrence: "daily", repeatUntil: "2026-06-13" }}
        onPatch={onPatch}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove repeat" }));
    expect(onPatch).toHaveBeenCalledWith({ recurrence: "none", repeatUntil: "2026-06-09" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
