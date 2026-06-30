import type { TimeLogDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { computeTodayStats } from "./dashboard-stats";

const TZ = "America/New_York";

function log(
  partial: Partial<TimeLogDto> & Pick<TimeLogDto, "startTime" | "durationSec">
): TimeLogDto {
  return {
    id: partial.id ?? "log-1",
    userId: "user-1",
    taskId: "task-1",
    startTime: partial.startTime,
    endTime: partial.endTime ?? partial.startTime,
    durationSec: partial.durationSec,
    description: partial.description ?? null,
    isBillable: partial.isBillable ?? false,
    source: partial.source ?? "timer"
  };
}

describe("computeTodayStats", () => {
  const todayDateKey = "2026-06-19";

  it("sums only logs from today in the workspace timezone", () => {
    const stats = computeTodayStats({
      timezone: TZ,
      todayDateKey,
      logs: [
        log({
          startTime: "2026-06-19T14:00:00.000Z",
          durationSec: 3600,
          isBillable: true
        }),
        log({
          startTime: "2026-06-18T14:00:00.000Z",
          durationSec: 7200
        })
      ]
    });

    expect(stats.totalHours).toBe(1);
    expect(stats.billableHours).toBe(1);
  });

  it("includes active timer seconds and billable flag", () => {
    const stats = computeTodayStats({
      timezone: TZ,
      todayDateKey,
      logs: [
        log({
          startTime: "2026-06-19T10:00:00.000Z",
          durationSec: 1800
        })
      ],
      activeTimerSec: 1800,
      isBillableActive: true
    });

    expect(stats.totalHours).toBe(1);
    expect(stats.billableHours).toBe(0.5);
  });
});
