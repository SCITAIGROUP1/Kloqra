import type { TimeLogDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  formatHoursCompact,
  formatWeekSectionLabel,
  formatWeekTotals,
  groupLogsByWeek
} from "./group-logs-by-week";

function log(
  partial: Partial<TimeLogDto> & Pick<TimeLogDto, "startTime" | "durationSec">
): TimeLogDto {
  return {
    id: partial.id ?? "log-1",
    userId: "user-1",
    taskId: partial.taskId ?? "task-1",
    startTime: partial.startTime,
    endTime: partial.endTime ?? partial.startTime,
    durationSec: partial.durationSec,
    description: partial.description ?? null,
    isBillable: partial.isBillable ?? true,
    source: partial.source ?? "manual"
  };
}

describe("groupLogsByWeek", () => {
  it("groups logs by monday week start and sorts newest week first", () => {
    const groups = groupLogsByWeek(
      [
        log({ id: "a", startTime: "2026-06-10T10:00:00.000Z", durationSec: 3600 }),
        log({
          id: "b",
          startTime: "2026-06-03T10:00:00.000Z",
          durationSec: 7200,
          isBillable: false
        }),
        log({ id: "c", startTime: "2026-06-11T10:00:00.000Z", durationSec: 1800 })
      ],
      "UTC",
      "monday"
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.logs.map((l) => l.id)).toEqual(["c", "a"]);
    expect(groups[0]?.totalSec).toBe(5400);
    expect(groups[0]?.billableSec).toBe(5400);
    expect(groups[1]?.logs.map((l) => l.id)).toEqual(["b"]);
    expect(groups[1]?.totalSec).toBe(7200);
    expect(groups[1]?.billableSec).toBe(0);
  });

  it("respects sunday week start preference", () => {
    const groups = groupLogsByWeek(
      [log({ startTime: "2026-06-07T12:00:00.000Z", durationSec: 3600 })],
      "UTC",
      "sunday"
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.weekKey).toBe("2026-06-07");
  });
});

describe("format helpers", () => {
  it("formats week section label", () => {
    const label = formatWeekSectionLabel(new Date(Date.UTC(2026, 5, 8)), "UTC");
    expect(label).toBe("Week of Jun 8");
  });

  it("formats compact hours", () => {
    expect(formatHoursCompact(0)).toBe("0h");
    expect(formatHoursCompact(3600)).toBe("1h");
    expect(formatHoursCompact(5400)).toBe("1.5h");
  });

  it("formats week totals string", () => {
    expect(formatWeekTotals(28800, 25200)).toBe("Total: 8h · Billable: 7h");
  });
});
