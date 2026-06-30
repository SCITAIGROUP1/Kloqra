/** Clock time for export sheets (HH:mm). DB values stay full datetimes. */
export function formatExportClockTime(date: Date, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timeZone ?? "UTC"
    }).format(date);
  } catch {
    return date.toISOString().slice(11, 16);
  }
}

/** Calendar date key (YYYY-MM-DD) in workspace timezone for grouping and display. */
export function formatExportDateKey(date: Date, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timeZone ?? "UTC"
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** UTC weekday 0=Sunday … 6=Saturday for a calendar date in workspace timezone. */
export function exportWeekdayUtc(date: Date, timeZone?: string): number {
  const key = formatExportDateKey(date, timeZone);
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

export function isWeekdayDateKey(dateKey: string): boolean {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return dow !== 0 && dow !== 6;
}

export function enumerateDateKeysInRange(from: Date, to: Date, timeZone?: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const cursor = new Date(from);
  cursor.setUTCHours(12, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(12, 0, 0, 0);
  while (cursor <= end) {
    const key = formatExportDateKey(cursor, timeZone);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}
