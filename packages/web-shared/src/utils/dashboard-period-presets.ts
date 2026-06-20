export type DashboardPeriodPreset = "today" | "week" | "month" | "all";

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
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}

export function applyDashboardPeriodPreset(
  preset: DashboardPeriodPreset,
  timezone?: string,
  _inceptionDate?: string
): {
  from: string;
  to: string;
} {
  const effectiveTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const to = todayInZone(effectiveTimezone);
  const from = new Date(to);

  const format = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  if (preset === "all") {
    return {
      from: "2000-01-01",
      to: format(to)
    };
  }

  if (preset === "today") {
    const todayStr = format(to);
    return { from: todayStr, to: todayStr };
  }

  if (preset === "week") {
    const day = to.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    from.setDate(from.getDate() + diff);
    const toSunday = new Date(from);
    toSunday.setDate(from.getDate() + 6);
    return {
      from: format(from),
      to: format(toSunday)
    };
  }

  // month preset
  from.setDate(1);
  return {
    from: format(from),
    to: format(to)
  };
}

export function matchDashboardPeriodPreset<T extends DashboardPeriodPreset>(
  start: string,
  end: string,
  presets: readonly T[] = [
    "today",
    "week",
    "month",
    "all"
  ] as readonly DashboardPeriodPreset[] as readonly T[],
  timezone?: string,
  inceptionDate?: string
): T | null {
  for (const preset of presets) {
    const range = applyDashboardPeriodPreset(preset, timezone, inceptionDate);
    if (range.from === start && range.to === end) return preset;
  }
  return null;
}
