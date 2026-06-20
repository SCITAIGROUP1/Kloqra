import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "./date-range-picker.js";

describe("DateRangePicker", () => {
  it("shows the selected range on the trigger", () => {
    render(
      <DateRangePicker
        from="2026-06-08"
        to="2026-06-14"
        onChange={vi.fn()}
        ariaLabel="Date range"
      />
    );

    expect(screen.getByRole("button", { name: "Date range" })).toHaveTextContent(
      "Jun 8 – Jun 14, 2026"
    );
  });

  it("applies a newly selected range", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DateRangePicker
        from="2026-06-01"
        to="2026-06-07"
        onChange={onChange}
        ariaLabel="Date range"
        numberOfMonths={1}
      />
    );

    await user.click(screen.getByRole("button", { name: "Date range" }));
    await user.click(screen.getByRole("button", { name: "2026-06-10" }));
    await user.click(screen.getByRole("button", { name: "2026-06-12" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onChange).toHaveBeenCalledWith("2026-06-10", "2026-06-12");
  });

  it("highlights today in the open calendar", async () => {
    vi.setSystemTime(new Date("2026-06-10T12:00:00Z"));

    const user = userEvent.setup();
    render(
      <DateRangePicker
        from="2026-06-01"
        to="2026-06-07"
        onChange={vi.fn()}
        ariaLabel="Date range"
        numberOfMonths={1}
      />
    );

    await user.click(screen.getByRole("button", { name: "Date range" }));
    const today = screen.getByRole("button", { name: "2026-06-10" });
    expect(today).toHaveClass("bg-muted");
    expect(today).not.toHaveClass("bg-primary");
    expect(today).toHaveAttribute("aria-current", "date");

    vi.useRealTimers();
  });

  it("can keep two months visible on mobile when collapse is disabled", async () => {
    const user = userEvent.setup();
    render(
      <DateRangePicker
        from="2026-05-22"
        to="2026-06-21"
        onChange={vi.fn()}
        ariaLabel="Date range"
        numberOfMonths={2}
        collapseToSingleMonthOnMobile={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Date range" }));
    expect(screen.getByText("May 2026")).toBeInTheDocument();
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });
});
