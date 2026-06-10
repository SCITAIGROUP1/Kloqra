export const SLOT_MINUTES = 30;
export const CALENDAR_START_HOUR = 0;
export const CALENDAR_END_HOUR = 24;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Monday-based week start */
export function startOfWeek(d: Date): Date {
  return startOfWeekWithPreference(d, "monday");
}

export function startOfWeekWithPreference(
  d: Date,
  weekStart: "monday" | "sunday" = "monday"
): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  if (weekStart === "sunday") {
    x.setDate(x.getDate() - day);
    return x;
  }
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function slotStart(day: Date, hour: number, minute: number): Date {
  const start = new Date(day);
  start.setHours(hour, minute, 0, 0);
  return start;
}

export function slotEnd(start: Date): Date {
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + SLOT_MINUTES);
  return end;
}

export function formatDayHeader(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = weekStart.toLocaleDateString(undefined, opts);
  const endStr = weekEnd.toLocaleDateString(undefined, {
    ...opts,
    year: weekStart.getFullYear() !== weekEnd.getFullYear() ? "numeric" : undefined
  });
  return `${startStr} – ${endStr}, ${weekEnd.getFullYear()}`;
}

export function formatTimeLabel(hour: number, minute: number): string {
  const d = new Date(2000, 0, 1, hour, minute);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: minute === 0 ? undefined : "2-digit"
  });
}

export function getVisibleMinutes(): number {
  return (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60;
}

export function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  if (timeZone === "UTC") return 0;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => Number(parts.find((p) => p.type === type)?.value);

    let hour = getVal("hour");
    if (hour === 24) hour = 0;

    const tzDateUtc = Date.UTC(
      getVal("year"),
      getVal("month") - 1,
      getVal("day"),
      hour,
      getVal("minute"),
      getVal("second")
    );

    return tzDateUtc - date.getTime();
  } catch {
    return 0;
  }
}

export function localMidnightUtcInZone(y: number, m: number, d: number, timezone: string): Date {
  if (timezone === "UTC") {
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  }
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const offsetMs = getTimezoneOffsetMs(guess, timezone);
  return new Date(guess.getTime() - offsetMs);
}

export function todayInZone(timezone: string): Date {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
    const parts = formatter.formatToParts(now);
    const getVal = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const y = getVal("year");
    const m = getVal("month");
    const d = getVal("day");
    return new Date(y, m - 1, d, 0, 0, 0);
  } catch {
    const x = new Date();
    x.setHours(0, 0, 0, 0);
    return x;
  }
}

export function isSameDayInZone(day: Date, now: Date, timezone: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
    const parts = formatter.formatToParts(now);
    const getVal = (type: string) => Number(parts.find((p) => p.type === type)?.value);

    return (
      day.getFullYear() === getVal("year") &&
      day.getMonth() + 1 === getVal("month") &&
      day.getDate() === getVal("day")
    );
  } catch {
    return isSameDay(day, now);
  }
}

export function getZoneHourAndMinute(
  date: Date,
  timezone: string
): { hour: number; minute: number } {
  const tz = timezone?.trim() || "UTC";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    let hour = getVal("hour");
    const minute = getVal("minute");
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      throw new Error("Invalid timezone parts");
    }
    if (hour === 24) hour = 0;
    return { hour, minute };
  } catch {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    let hour = getVal("hour");
    if (hour === 24) hour = 0;
    return { hour, minute: getVal("minute") };
  }
}

export function toDateKeyInZone(d: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
    const parts = formatter.formatToParts(d);
    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
    const y = getVal("year");
    const m = getVal("month").padStart(2, "0");
    const dStr = getVal("day").padStart(2, "0");
    return `${y}-${m}-${dStr}`;
  } catch {
    return toDateKey(d);
  }
}

export function toTimeValueInZone(d: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
    let hour = getVal("hour");
    if (hour === "24") hour = "00";
    const h = hour.padStart(2, "0");
    const m = getVal("minute").padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return toTimeValue(d);
  }
}

export function combineDayAndTimeInZone(dateKey: string, time: string, timezone: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, h || 0, min || 0, 0));
  const offsetMs = getTimezoneOffsetMs(guess, timezone);
  return new Date(guess.getTime() - offsetMs);
}

export function minutesFromCalendarStart(d: Date, timezone: string = "UTC"): number {
  const { hour, minute } = getZoneHourAndMinute(d, timezone);
  return hour * 60 + minute - CALENDAR_START_HOUR * 60;
}

/** Calendar date key (YYYY-MM-DD) in the user's timezone — use for column identity and clipping. */
export function calendarDateKey(day: Date, timezone: string = "UTC"): string {
  return toDateKeyInZone(day, timezone);
}

export function dayBoundsFromDateKey(
  dateKey: string,
  timezone: string = "UTC"
): { dayStart: Date; dayEnd: Date } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dayStart = localMidnightUtcInZone(y, m, d, timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd };
}

export function clipLogToDay(
  log: { startTime: string; endTime: string },
  day: Date,
  timezone: string = "UTC"
): { start: Date; end: Date } | null {
  const dateKey = calendarDateKey(day, timezone);
  const { dayStart, dayEnd } = dayBoundsFromDateKey(dateKey, timezone);
  const logStart = new Date(log.startTime);
  const logEnd = new Date(log.endTime);
  const start = new Date(Math.max(logStart.getTime(), dayStart.getTime()));
  const end = new Date(Math.min(logEnd.getTime(), dayEnd.getTime()));
  if (end <= start) return null;
  return { start, end };
}

export function clipLogToDateKey(
  log: { startTime: string; endTime: string },
  dateKey: string,
  timezone: string = "UTC"
): { start: Date; end: Date } | null {
  const { dayStart, dayEnd } = dayBoundsFromDateKey(dateKey, timezone);
  const logStart = new Date(log.startTime);
  const logEnd = new Date(log.endTime);
  const start = new Date(Math.max(logStart.getTime(), dayStart.getTime()));
  const end = new Date(Math.min(logEnd.getTime(), dayEnd.getTime()));
  if (end <= start) return null;
  return { start, end };
}

export function blockStyle(
  start: Date,
  end: Date,
  timezone: string = "UTC"
): { top: string; height: string; display?: string } {
  const total = getVisibleMinutes();
  const topMin = Math.max(0, minutesFromCalendarStart(start, timezone));
  const endMin = Math.min(total, minutesFromCalendarStart(end, timezone));
  if (endMin <= topMin) {
    return { top: "0%", height: "0%", display: "none" };
  }
  const heightMin = endMin - topMin;
  return {
    top: `${(topMin / total) * 100}%`,
    height: `${(heightMin / total) * 100}%`
  };
}

export function buildSlotRows(): { hour: number; minute: number }[] {
  const rows: { hour: number; minute: number }[] = [];
  for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      rows.push({ hour, minute });
    }
  }
  return rows;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, d));
}

export function toTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function combineDayAndTime(dateKey: string, time: string): Date {
  const day = fromDateKey(dateKey);
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  day.setHours(h || 0, m || 0, 0, 0);
  return day;
}

export function formatDraftDateLabel(
  draft: { date: string },
  log?: { startTime: string } | null
): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    return fromDateKey(draft.date).toLocaleDateString(undefined, opts);
  }
  if (log?.startTime) {
    const d = new Date(log.startTime);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, opts);
  }
  return "";
}

export function slotIndexFromTime(hour: number, minute: number): number {
  const rows = buildSlotRows();
  return rows.findIndex((r) => r.hour === hour && r.minute === minute);
}

export function timeFromSlotIndex(index: number): { hour: number; minute: number } {
  return buildSlotRows()[index];
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function endOfMonth(d: Date): Date {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + 1);
  x.setDate(0);
  return startOfDay(x);
}

export function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Monday-first grid cells for a month (null = padding) */
export function getMonthGrid(month: Date): (Date | null)[][] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function snapInstantToSlot(instant: Date, timezone: string = "UTC"): Date {
  const key = toDateKeyInZone(instant, timezone);
  const { hour, minute } = getZoneHourAndMinute(instant, timezone);
  const totalMin = hour * 60 + minute;
  const snappedMin = Math.round(totalMin / SLOT_MINUTES) * SLOT_MINUTES;
  const snappedHour = Math.floor(snappedMin / 60);
  const snappedMinute = snappedMin % 60;
  const hh = String(snappedHour).padStart(2, "0");
  const mm = String(snappedMinute).padStart(2, "0");
  return combineDayAndTimeInZone(key, `${hh}:${mm}`, timezone);
}

/** Shift a log by a calendar drag, snapping to the same 30-minute grid as slot selection. */
export function findOverlappingLog(
  logs: { id: string; startTime: string; endTime: string }[],
  start: Date,
  end: Date,
  excludeId?: string
) {
  return logs.find(
    (log) => log.id !== excludeId && new Date(log.startTime) < end && new Date(log.endTime) > start
  );
}

export type OccupancySegment = {
  id: string;
  start: Date;
  end: Date;
  workspaceId: string;
  workspaceName: string;
  label: string;
};

export function buildDayOccupancySegments(
  dateKey: string,
  occupancy: {
    id: string;
    startTime: string;
    endTime: string;
    workspaceId: string;
    workspaceName: string;
    label: string;
  }[],
  timezone: string,
  currentWorkspaceId: string
): OccupancySegment[] {
  return occupancy
    .filter((item) => item.workspaceId !== currentWorkspaceId)
    .map((item) => {
      const clip = clipLogToDateKey(item, dateKey, timezone);
      if (!clip) return null;
      return {
        id: item.id,
        start: clip.start,
        end: clip.end,
        workspaceId: item.workspaceId,
        workspaceName: item.workspaceName,
        label: item.label
      };
    })
    .filter((s): s is OccupancySegment => s !== null);
}

export function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

export function isSlotOccupiedElsewhere(
  slotStart: Date,
  slotEnd: Date,
  segments: OccupancySegment[],
  excludeLogId?: string
): OccupancySegment | undefined {
  return segments.find(
    (seg) => seg.id !== excludeLogId && intervalsOverlap(slotStart, slotEnd, seg.start, seg.end)
  );
}

export function findOccupancyConflict(
  occupancy: {
    id: string;
    startTime: string;
    endTime: string;
    workspaceName: string;
    label: string;
  }[],
  start: Date,
  end: Date,
  excludeId?: string
) {
  return occupancy.find(
    (item) =>
      item.id !== excludeId && new Date(item.startTime) < end && new Date(item.endTime) > start
  );
}

export function occupancyConflictLabel(item: { workspaceName: string; label: string }): string {
  return `${item.workspaceName}: ${item.label}`;
}

export function slotIntervalForIndex(
  dateKey: string,
  index: number,
  timezone: string
): { start: Date; end: Date } {
  const { hour, minute } = timeFromSlotIndex(index);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const start = combineDayAndTimeInZone(dateKey, `${hh}:${mm}`, timezone);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
  return { start, end };
}

export function slotRangeInterval(
  dateKey: string,
  startIndex: number,
  endIndex: number,
  timezone: string
): { start: Date; end: Date } {
  const lo = Math.min(startIndex, endIndex);
  const hi = Math.max(startIndex, endIndex);
  const start = slotIntervalForIndex(dateKey, lo, timezone).start;
  const end = slotIntervalForIndex(dateKey, hi, timezone).end;
  return { start, end };
}

export function rangeOccupiedElsewhere(
  dateKey: string,
  startIndex: number,
  endIndex: number,
  segments: OccupancySegment[],
  timezone: string,
  excludeLogId?: string
): OccupancySegment | undefined {
  const { start, end } = slotRangeInterval(dateKey, startIndex, endIndex, timezone);
  return isSlotOccupiedElsewhere(start, end, segments, excludeLogId);
}

export function formatSegmentTimeRange(start: Date, end: Date, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  };
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}

/** User-facing overlap explanation (one person, one timeline — any project/workspace). */
export function formatOverlapError(
  conflictLabel: string,
  start: Date,
  end: Date,
  timezone: string
): string {
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  };
  const range = `${start.toLocaleTimeString(undefined, timeOpts)} – ${end.toLocaleTimeString(undefined, timeOpts)}`;
  return `You can't log time for two projects at once — even across workspaces. This slot overlaps "${conflictLabel}" (${range}). Check List view for all entries that day.`;
}

export function computeLogMoveRange(
  log: { startTime: string; endTime: string },
  anchorClipStart: Date,
  previewStart: Date,
  timezone: string = "UTC"
): { start: Date; end: Date } {
  const logStart = new Date(log.startTime);
  const logEnd = new Date(log.endTime);
  const durationMs = logEnd.getTime() - logStart.getTime();

  const snappedAnchor = snapInstantToSlot(anchorClipStart, timezone);
  const snappedPreview = snapInstantToSlot(previewStart, timezone);
  const deltaMs = snappedPreview.getTime() - snappedAnchor.getTime();

  const start = new Date(logStart.getTime() + deltaMs);
  const end = new Date(start.getTime() + durationMs);
  return { start, end };
}

export function pointerYToTime(
  day: Date,
  clientY: number,
  columnTop: number,
  columnHeight: number,
  timezone: string = "UTC"
): Date {
  const ratio = Math.max(0, Math.min(1, (clientY - columnTop) / columnHeight));
  const total = getVisibleMinutes();
  const slotCount = Math.floor(total / SLOT_MINUTES);
  const slotIndex = Math.min(slotCount - 1, Math.round(ratio * slotCount));
  const { hour, minute } = timeFromSlotIndex(slotIndex);

  const y = day.getFullYear();
  const m = day.getMonth() + 1;
  const d = day.getDate();
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
  const offsetMs = getTimezoneOffsetMs(guess, timezone);
  return new Date(guess.getTime() - offsetMs);
}

export function totalSecondsOnDay(
  logs: { startTime: string; endTime: string }[],
  day: Date,
  timezone: string = "UTC"
): number {
  return logs.reduce((sum, log) => {
    const clip = clipLogToDay(log, day, timezone);
    if (!clip) return sum;
    return sum + (clip.end.getTime() - clip.start.getTime()) / 1000;
  }, 0);
}
