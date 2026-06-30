import type { TimeLogDto } from "@kloqra/contracts";
import { todayInZone, toDateKeyInZone } from "@kloqra/web-shared";

export type TodayStatsInput = {
  logs: TimeLogDto[];
  timezone: string;
  activeTimerSec?: number;
  isBillableActive?: boolean;
  /** Override for tests — YYYY-MM-DD in the workspace timezone */
  todayDateKey?: string;
};

export function computeTodayStats({
  logs,
  timezone,
  activeTimerSec = 0,
  isBillableActive = false,
  todayDateKey
}: TodayStatsInput) {
  const todayStr = todayDateKey ?? toDateKeyInZone(todayInZone(timezone), timezone);

  let totalSec = 0;
  let billableSec = 0;

  for (const log of logs) {
    if (toDateKeyInZone(new Date(log.startTime), timezone) !== todayStr) {
      continue;
    }
    totalSec += log.durationSec;
    if (log.isBillable) {
      billableSec += log.durationSec;
    }
  }

  if (activeTimerSec > 0) {
    totalSec += activeTimerSec;
    if (isBillableActive) {
      billableSec += activeTimerSec;
    }
  }

  return {
    totalSec,
    billableSec,
    totalHours: Math.round((totalSec / 3600) * 10) / 10,
    billableHours: Math.round((billableSec / 3600) * 10) / 10
  };
}
