import { describe, expect, it } from "vitest";
import {
  buildTeamActivitiesQuery,
  dayChartLabel,
  formatDurationSec,
  formatTimeSince,
  formatWeekHours,
  memberInitials,
  shouldShowDayLabel,
  sparklineBarHeightPx,
  teamActivitiesPeriodTotalLabel
} from "./team-activities-data";

describe("team-activities-data", () => {
  it("formats duration seconds", () => {
    expect(formatDurationSec(3600)).toBe("1h");
    expect(formatDurationSec(3900)).toBe("1h 5m");
    expect(formatDurationSec(900)).toBe("15m");
  });

  it("formats week hours", () => {
    expect(formatWeekHours(0)).toBe("0h");
    expect(formatWeekHours(6.25)).toBe("6.3h");
  });

  it("formats member initials", () => {
    expect(memberInitials("Sam Rivera")).toBe("SR");
    expect(memberInitials("Sam")).toBe("SA");
  });

  it("formats relative time since", () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatTimeSince(recent)).toBe("5 mins ago");
  });

  it("builds team activities query with scope filters", () => {
    const query = buildTeamActivitiesQuery({
      from: "2025-06-09T00:00:00.000Z",
      to: "2025-06-15T23:59:59.999Z",
      projectId: "proj-1",
      categoryId: "cat-1",
      taskId: "task-1"
    });

    expect(query).toContain("from=");
    expect(query).toContain("projectId=proj-1");
    expect(query).toContain("categoryId=cat-1");
    expect(query).toContain("taskId=task-1");
  });

  it("labels period total column from dashboard range", () => {
    expect(teamActivitiesPeriodTotalLabel("week")).toBe("This week");
    expect(teamActivitiesPeriodTotalLabel("today")).toBe("Today");
    expect(teamActivitiesPeriodTotalLabel("custom")).toBe("Period");
  });

  it("uses weekday labels for week view and month-day labels for longer periods", () => {
    expect(dayChartLabel("2025-06-09", 7)).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    expect(dayChartLabel("2025-06-09", 17)).toContain("Jun");
  });

  it("shows sparse axis labels for long periods", () => {
    expect(shouldShowDayLabel(0, 7)).toBe(true);
    expect(shouldShowDayLabel(3, 7)).toBe(true);
    expect(shouldShowDayLabel(1, 17)).toBe(false);
    expect(shouldShowDayLabel(16, 17)).toBe(true);
  });

  it("scales sparkline bar height from daily max", () => {
    expect(sparklineBarHeightPx(0, 8)).toBe(0);
    expect(sparklineBarHeightPx(4, 8)).toBeGreaterThanOrEqual(4);
    expect(sparklineBarHeightPx(8, 8)).toBe(36);
  });
});
