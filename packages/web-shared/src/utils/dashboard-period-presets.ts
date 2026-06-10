import { toDateInputValue } from "./date-input";

export type DashboardPeriodPreset = "today" | "week" | "month";

export function applyDashboardPeriodPreset(preset: DashboardPeriodPreset): {
  from: string;
  to: string;
} {
  const to = new Date();
  const from = new Date();

  if (preset === "today") {
    return { from: toDateInputValue(to), to: toDateInputValue(to) };
  }

  if (preset === "week") {
    const day = to.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    from.setDate(from.getDate() + diff);
    return { from: toDateInputValue(from), to: toDateInputValue(to) };
  }

  from.setDate(1);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export function matchDashboardPeriodPreset<T extends DashboardPeriodPreset>(
  start: string,
  end: string,
  presets: readonly T[] = [
    "today",
    "week",
    "month"
  ] as readonly DashboardPeriodPreset[] as readonly T[]
): T | null {
  for (const preset of presets) {
    const range = applyDashboardPeriodPreset(preset);
    if (range.from === start && range.to === end) return preset;
  }
  return null;
}
