import type { TaskDto, TimeLogDto } from "@kloqra/contracts";
import {
  combineDayAndTimeInZone,
  timeFromSlotIndex,
  toDateKey,
  toDateKeyInZone,
  toTimeValueInZone
} from "./calendar-utils";

export type TimeEntryDraft = {
  projectId: string;
  taskSelection: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  isBillable: boolean;
  recurrence?: "none" | "daily" | "weekdays" | "weekly";
  repeatUntil?: string;
};

export function suggestBillableFromTask(tasks: TaskDto[], taskSelection: string): boolean {
  if (!taskSelection) return true;
  return tasks.find((t) => t.id === taskSelection)?.billableDefault ?? true;
}

export function canSaveTaskDraft(draft: TimeEntryDraft): boolean {
  if (!draft.projectId) return false;
  return Boolean(draft.taskSelection);
}

export function taskSaveHint(draft: TimeEntryDraft): string | null {
  if (!draft.projectId) return null;
  if (!draft.taskSelection) {
    return "Select a task for this project to enable Save.";
  }
  return null;
}

export function draftToIsoRange(
  draft: TimeEntryDraft,
  timezone: string = "UTC"
): { startTime: string; endTime: string } {
  const start = combineDayAndTimeInZone(draft.date, draft.startTime, timezone);
  const end = combineDayAndTimeInZone(draft.date, draft.endTime, timezone);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

function emptyTaskFields(): Pick<TimeEntryDraft, "projectId" | "taskSelection"> {
  return { projectId: "", taskSelection: "" };
}

export function draftFromSlot(
  day: Date,
  hour: number,
  minute: number,
  _timezone: string = "UTC",
  endHour?: number,
  endMinute?: number
): TimeEntryDraft {
  const pad = (n: number) => String(n).padStart(2, "0");
  let endH = hour;
  let endM = minute + 30;
  if (endHour !== undefined && endMinute !== undefined) {
    endH = endHour;
    endM = endMinute;
  } else {
    if (endM >= 60) {
      endH += 1;
      endM = 0;
    }
  }
  return {
    ...emptyTaskFields(),
    date: toDateKey(day),
    startTime: `${pad(hour)}:${pad(minute)}`,
    endTime: `${pad(endH)}:${pad(endM)}`,
    description: "",
    isBillable: true,
    recurrence: "none",
    repeatUntil: toDateKey(day)
  };
}

export function draftFromSlotRange(
  day: Date,
  startIndex: number,
  endIndex: number,
  _timezone: string = "UTC"
): TimeEntryDraft {
  const startSlot = timeFromSlotIndex(Math.min(startIndex, endIndex));
  const endSlot = timeFromSlotIndex(Math.max(startIndex, endIndex));
  const endMinute = endSlot.minute + 30;
  const endHour = endMinute >= 60 ? endSlot.hour + 1 : endSlot.hour;
  const normalizedEndMinute = endMinute >= 60 ? 0 : endMinute;
  return draftFromSlot(
    day,
    startSlot.hour,
    startSlot.minute,
    _timezone,
    endHour,
    normalizedEndMinute
  );
}

export function estimateRecurrenceCount(
  startDate: string,
  endDate: string,
  recurrence: "daily" | "weekdays" | "weekly"
): number {
  if (!startDate || !endDate || startDate > endDate) return 0;

  let count = 0;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const startDayOfWeek = start.getUTCDay();

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (recurrence === "weekdays") {
      const dayOfWeek = d.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    } else if (recurrence === "weekly") {
      if (d.getUTCDay() !== startDayOfWeek) continue;
    }
    count++;
  }
  return count;
}

export function draftFromLog(
  log: TimeLogDto,
  tasks: TaskDto[],
  timezone: string = "UTC"
): TimeEntryDraft {
  const start = new Date(log.startTime);
  const end = new Date(log.endTime);
  const task = tasks.find((t) => t.id === log.taskId);
  return {
    projectId: task?.projectId ?? "",
    taskSelection: log.taskId,
    date: toDateKeyInZone(start, timezone),
    startTime: toTimeValueInZone(start, timezone),
    endTime: toTimeValueInZone(end, timezone),
    description: log.description ?? "",
    isBillable: log.isBillable,
    recurrence: "none",
    repeatUntil: toDateKeyInZone(start, timezone)
  };
}
