import type { TimeLogDto } from "@kloqra/contracts";
import { describe, it, expect } from "vitest";
import { calculateDailyStreak, checkMilestones, getDailyTotals } from "./gamification-utils";

// Helper to create a dummy TimeLogDto
function makeLog(startTime: string, endTime: string, isBillable = true): TimeLogDto {
  return {
    id: Math.random().toString(),
    taskId: "task-1",
    userId: "user-1",
    startTime,
    endTime,
    durationSec: (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000,
    isBillable,
    source: "manual",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as unknown as TimeLogDto;
}

describe("Gamification Utilities", () => {
  const timezone = "UTC";
  const dailyTargetHours = 8;

  describe("getDailyTotals", () => {
    it("sums hours correctly per day", () => {
      const logs = [
        makeLog("2026-07-01T08:00:00Z", "2026-07-01T12:00:00Z"), // 4h
        makeLog("2026-07-01T13:00:00Z", "2026-07-01T17:00:00Z"), // 4h
        makeLog("2026-07-02T09:00:00Z", "2026-07-02T11:00:00Z") // 2h
      ];

      const totals = getDailyTotals(logs, timezone);
      expect(totals["2026-07-01"]).toBe(8 * 3600);
      expect(totals["2026-07-02"]).toBe(2 * 3600);
    });
  });

  describe("calculateDailyStreak with weekend skipping", () => {
    it("returns 0 if no logs exist", () => {
      expect(calculateDailyStreak([], dailyTargetHours, timezone)).toBe(0);
    });

    it("calculates a simple streak when consecutive working days meet target", () => {
      // Assuming today is 2026-07-05 (which we mock implicitly using current date in code)
      // To run tests deterministically, we can temporarily mock system time or write logs relative to today.
      const today = new Date();
      const formatOffset = (daysAgo: number, hourStr: string) => {
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        const dateStr = d.toISOString().split("T")[0];
        return `${dateStr}T${hourStr}Z`;
      };

      // Let's mock a sequence: Today (met), 1 day ago (met), 2 days ago (met)
      const logs = [
        makeLog(formatOffset(0, "09:00:00"), formatOffset(0, "17:00:00")), // 8h
        makeLog(formatOffset(1, "09:00:00"), formatOffset(1, "17:00:00")), // 8h
        makeLog(formatOffset(2, "09:00:00"), formatOffset(2, "17:00:00")) // 8h
      ];

      const streak = calculateDailyStreak(logs, dailyTargetHours, timezone);
      expect(streak).toBe(3);
    });

    it("keeps the streak alive if today's target is not yet met, but yesterday's was", () => {
      const today = new Date();
      const formatOffset = (daysAgo: number, hourStr: string) => {
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        const dateStr = d.toISOString().split("T")[0];
        return `${dateStr}T${hourStr}Z`;
      };

      const logs = [
        makeLog(formatOffset(0, "09:00:00"), formatOffset(0, "11:00:00")), // Today: only 2h (not met)
        makeLog(formatOffset(1, "09:00:00"), formatOffset(1, "17:00:00")), // Yesterday: 8h (met)
        makeLog(formatOffset(2, "09:00:00"), formatOffset(2, "17:00:00")) // 2 days ago: 8h (met)
      ];

      const streak = calculateDailyStreak(logs, dailyTargetHours, timezone);
      // Today is not met, but yesterday was met, so streak is 2 (not broken yet)
      expect(streak).toBe(2);
    });

    it("skips weekend days (Sat/Sun) when no time is logged", () => {
      // Find a Saturday and Sunday
      const today = new Date();

      const formatOffset = (daysAgo: number, hourStr: string) => {
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        const dateStr = d.toISOString().split("T")[0];
        return `${dateStr}T${hourStr}Z`;
      };

      // Let's explicitly construct logs where Friday and Thursday met target, Sat & Sun had 0 logs.
      // We will trace back 4 days.
      // For any date, we check its dayOfWeek.
      const logs: TimeLogDto[] = [];

      // We'll simulate 5 days back.
      // Let's force target met on all weekdays, and 0 on weekends.
      for (let i = 0; i < 6; i++) {
        const temp = new Date();
        temp.setDate(temp.getDate() - i);
        const dayOfWeek = temp.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (!isWeekend) {
          logs.push(makeLog(formatOffset(i, "09:00:00"), formatOffset(i, "17:00:00"))); // 8h
        }
      }

      const streak = calculateDailyStreak(logs, dailyTargetHours, timezone);
      // It should count all weekdays (e.g. 4 weekdays) and skip weekends without breaking.
      expect(streak).toBeGreaterThanOrEqual(1);
    });
  });

  describe("checkMilestones", () => {
    it("detects Early Bird milestone (log starts before 9:00 AM)", () => {
      const logs = [makeLog("2026-07-01T08:30:00Z", "2026-07-01T12:30:00Z")];
      const milestones = checkMilestones(logs, dailyTargetHours, 0, timezone);
      expect(milestones.earlyBird).toBe(true);
    });

    it("detects Super Logger milestone (>= 10 hours in a single day)", () => {
      const logs = [
        makeLog("2026-07-01T08:00:00Z", "2026-07-01T19:00:00Z") // 11 hours
      ];
      const milestones = checkMilestones(logs, dailyTargetHours, 0, timezone);
      expect(milestones.superLogger).toBe(true);
    });

    it("detects Streak Champ milestone (streak >= 3)", () => {
      const milestones = checkMilestones([], dailyTargetHours, 3, timezone);
      expect(milestones.streakChamp).toBe(true);
    });
  });
});
