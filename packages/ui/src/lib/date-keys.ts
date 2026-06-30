export type DateKeyParts = {
  year: number;
  month: number;
  day: number;
};

export function parseDateKey(key: string): DateKeyParts {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

export function toDateKey(year: number, month: number, day: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function dateKeyFromDate(date: Date): string {
  return toDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function dateFromKey(key: string): Date {
  const { year, month, day } = parseDateKey(key);
  return new Date(year, month - 1, day);
}

export function compareDateKeys(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function isDateKeyInRange(key: string, from: string, to: string): boolean {
  const start = compareDateKeys(from, to) <= 0 ? from : to;
  const end = compareDateKeys(from, to) <= 0 ? to : from;
  return compareDateKeys(key, start) >= 0 && compareDateKeys(key, end) <= 0;
}

export function normalizeDateRange(from: string, to: string): { from: string; to: string } {
  return compareDateKeys(from, to) <= 0 ? { from, to } : { from: to, to: from };
}

export function formatDateKeyLabel(
  key: string,
  options?: { includeYear?: boolean; locale?: string }
): string {
  const date = dateFromKey(key);
  return date.toLocaleDateString(options?.locale ?? "en-US", {
    month: "short",
    day: "numeric",
    ...(options?.includeYear === false ? {} : { year: "numeric" })
  });
}

export function formatDateRangeLabel(
  from: string,
  to: string,
  options?: { locale?: string }
): string {
  const { from: start, to: end } = normalizeDateRange(from, to);
  if (start === end) {
    return formatDateKeyLabel(start, { locale: options?.locale });
  }

  const startDate = dateFromKey(start);
  const endDate = dateFromKey(end);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  const startLabel = startDate.toLocaleDateString(options?.locale ?? "en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" })
  });
  const endLabel = formatDateKeyLabel(end, { locale: options?.locale });
  return `${startLabel} – ${endLabel}`;
}

export function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** Inclusive Monday- or Sunday-based week bounds for a calendar date key. */
export function weekBoundsForDateKey(
  key: string,
  weekStartsOn: 0 | 1 = 1
): { from: string; to: string } {
  const date = dateFromKey(key);
  const day = date.getDay();
  const start = new Date(date);
  if (weekStartsOn === 1) {
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  } else {
    start.setDate(start.getDate() - day);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: dateKeyFromDate(start), to: dateKeyFromDate(end) };
}

export function isSameMonthKey(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Build a month grid with null padding cells. */
export function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 1
): (string | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset = (firstDay - weekStartsOn + 7) % 7;
  const totalDays = daysInMonth(year, month);
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => toDateKey(year, month, index + 1))
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}
