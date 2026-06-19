/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DayLogGroup } from "./group-logs-by-week";
import { TimeTrackerDayTabs } from "./time-tracker-day-tabs";

const days: DayLogGroup[] = [
  {
    day: new Date(Date.UTC(2026, 5, 9)),
    dayKey: "2026-06-09",
    dayLabel: "Tue",
    dateLabel: "Jun 9",
    logs: [],
    totalSec: 7200
  },
  {
    day: new Date(Date.UTC(2026, 5, 10)),
    dayKey: "2026-06-10",
    dayLabel: "Wed",
    dateLabel: "Jun 10",
    logs: [],
    totalSec: 3600
  }
];

afterEach(() => {
  cleanup();
});

describe("TimeTrackerDayTabs", () => {
  it("renders day tabs with decimal hours", () => {
    render(<TimeTrackerDayTabs days={days} activeDayKey="2026-06-09" onDayChange={vi.fn()} />);

    expect(screen.getByText("Tue")).toBeTruthy();
    expect(screen.getByText("Jun 9")).toBeTruthy();
    expect(screen.getByText("2.00")).toBeTruthy();
    expect(screen.getByText("Wed")).toBeTruthy();
    expect(screen.getByText("1.00")).toBeTruthy();
  });

  it("calls onDayChange when a tab is clicked", () => {
    const onDayChange = vi.fn();
    render(<TimeTrackerDayTabs days={days} activeDayKey="2026-06-09" onDayChange={onDayChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Wed/i }));
    expect(onDayChange).toHaveBeenCalledWith("2026-06-10");
  });
});
