import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WeekDatePicker } from "./week-date-picker.js";

describe("WeekDatePicker", () => {
  it("shows the current range label on the trigger", () => {
    render(
      <WeekDatePicker
        anchorDate="2026-06-10"
        onChange={vi.fn()}
        label="Jun 8 – Jun 14, 2026"
        ariaLabel="Jump to week"
      />
    );

    expect(screen.getByRole("button", { name: "Jump to week" })).toHaveTextContent(
      "Jun 8 – Jun 14, 2026"
    );
  });

  it("jumps to the selected week when a day is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <WeekDatePicker
        anchorDate="2026-06-08"
        onChange={onChange}
        label="Jun 8 – Jun 14, 2026"
        ariaLabel="Jump to week"
      />
    );

    await user.click(screen.getByRole("button", { name: "Jump to week" }));
    await user.click(screen.getByRole("button", { name: "2026-06-20" }));

    expect(onChange).toHaveBeenCalledWith("2026-06-20");
  });

  it("highlights today with distinct primary styling", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-10T12:00:00"));

    const user = userEvent.setup();

    render(
      <WeekDatePicker
        anchorDate="2026-06-01"
        onChange={vi.fn()}
        label="Jun 1 – Jun 7, 2026"
        ariaLabel="Jump to week"
      />
    );

    await user.click(screen.getByRole("button", { name: "Jump to week" }));

    const today = screen.getByRole("button", { name: "2026-06-10" });
    expect(today).toHaveClass("ring-primary/35");
    expect(today).toHaveClass("bg-muted");
    expect(today).toHaveAttribute("aria-current", "date");
  });

  it("highlights only the selected day in day mode", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-20T12:00:00"));

    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <WeekDatePicker
        anchorDate="2026-06-13"
        onChange={onChange}
        label="Jun 13, 2026"
        highlightMode="day"
        ariaLabel="Select date"
      />
    );

    await user.click(screen.getByRole("button", { name: "Select date" }));

    // Selected date (June 13) should be highlighted as endpoint/primary
    const selected = screen.getByRole("button", { name: "2026-06-13" });
    expect(selected).toHaveClass("bg-primary");

    // Today (June 20) is also today. But is it highlighted as selected?
    // And what about other days in the week of June 20 (June 15-19)?
    const otherDay = screen.getByRole("button", { name: "2026-06-15" });
    expect(otherDay).not.toHaveClass("bg-primary/12");
    expect(otherDay).not.toHaveClass("text-primary");
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
