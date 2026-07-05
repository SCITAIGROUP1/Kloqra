import type { TimeLogDto } from "@kloqra/contracts";
import { toDateKeyInZone } from "@kloqra/web-shared";

/**
 * Calculates the total hours logged per day for the last 14 days.
 */
export function getDailyTotals(logs: TimeLogDto[], timezone: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const log of logs) {
    const start = new Date(log.startTime);
    const end = new Date(log.endTime);
    const dateKey = toDateKeyInZone(start, timezone);
    const duration = (end.getTime() - start.getTime()) / 1000;
    totals[dateKey] = (totals[dateKey] ?? 0) + duration;
  }
  return totals;
}

/**
 * Calculates the daily streak, counting backward from today or yesterday.
 * Weekends (Saturday and Sunday) are skipped if 0 hours are logged.
 */
export function calculateDailyStreak(
  logs: TimeLogDto[],
  dailyTargetHours: number,
  timezone: string
): number {
  const totals = getDailyTotals(logs, timezone);
  let streak = 0;

  const checkDate = new Date();

  for (let i = 0; i < 14; i++) {
    const dateKey = toDateKeyInZone(checkDate, timezone);
    const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = (totals[dateKey] ?? 0) / 3600;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (i === 0) {
      // Today: count if met, otherwise keep streak alive from yesterday
      if (hours >= dailyTargetHours) {
        streak++;
      }
    } else {
      if (hours >= dailyTargetHours) {
        streak++;
      } else if (isWeekend) {
        // Optional weekend with no/low logs: skip without breaking streak
      } else {
        // Weekday target not met: streak broken
        break;
      }
    }

    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

/**
 * Checks which milestones have been achieved in the last 14 days.
 */
export interface MilestonesState {
  earlyBird: boolean;
  superLogger: boolean;
  streakChamp: boolean;
  perfectWeek: boolean;
}

export function checkMilestones(
  logs: TimeLogDto[],
  dailyTargetHours: number,
  currentStreak: number,
  timezone: string
): MilestonesState {
  const totals = getDailyTotals(logs, timezone);

  // 1. Early Bird: Started any time log before 9:00 AM local time
  const earlyBird = logs.some((log) => {
    const start = new Date(log.startTime);
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone || undefined,
        hour: "numeric",
        hour12: false
      }).formatToParts(start);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "24", 10);
      return hour < 9;
    } catch {
      return start.getHours() < 9;
    }
  });

  // 2. Super Logger: Logged >= 10 hours in a single day
  const superLogger = Object.values(totals).some((sec) => sec / 3600 >= 10);

  // 3. Streak Champ: Current streak is at least 3 days
  const streakChamp = currentStreak >= 3;

  // 4. Perfect Week: Met target on all weekdays (Mon-Fri) of the current or previous week
  const perfectWeek = checkPerfectWeek(totals, dailyTargetHours, timezone);

  return {
    earlyBird,
    superLogger,
    streakChamp,
    perfectWeek
  };
}

/**
 * Helper to check if Mon-Fri target was met for either this week or the previous week.
 */
function checkPerfectWeek(
  totals: Record<string, number>,
  dailyTargetHours: number,
  timezone: string
): boolean {
  const getMonToFriKeys = (monday: Date): string[] => {
    const keys: string[] = [];
    const current = new Date(monday);
    for (let i = 0; i < 5; i++) {
      keys.push(toDateKeyInZone(current, timezone));
      current.setDate(current.getDate() + 1);
    }
    return keys;
  };

  const getMonday = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(date.setDate(diff));
  };

  const today = new Date();
  const thisMonday = getMonday(today);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  const checkWeek = (monday: Date): boolean => {
    const keys = getMonToFriKeys(monday);
    return keys.every((key) => {
      const hours = (totals[key] ?? 0) / 3600;
      return hours >= dailyTargetHours;
    });
  };

  return checkWeek(thisMonday) || checkWeek(lastMonday);
}
