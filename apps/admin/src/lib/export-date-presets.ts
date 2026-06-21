import { toDateInputValue } from "@kloqra/web-shared";

export type DatePreset = "today" | "week" | "7d" | "30d" | "90d" | "month";

export const EXPORT_PERIOD_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "month", label: "This month" }
];

export { toDateInputValue };

export function applyDatePreset(preset: DatePreset): { from: string; to: string } {
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

  if (preset === "month") {
    from.setDate(1);
    return { from: toDateInputValue(from), to: toDateInputValue(to) };
  }

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  from.setDate(from.getDate() - days);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export function matchExportDatePreset(from: string, to: string): DatePreset | null {
  for (const { id } of EXPORT_PERIOD_PRESETS) {
    const range = applyDatePreset(id);
    if (range.from === from && range.to === to) return id;
  }
  return null;
}

export function formatExportPeriodLabel(from: string, to: string): string {
  const f = new Date(from + "T12:00:00");
  const t = new Date(to + "T12:00:00");
  return `${f.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${t.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function describeExportPeriodApplied(from: string, to: string): string {
  const preset = matchExportDatePreset(from, to);
  if (preset) {
    const label = EXPORT_PERIOD_PRESETS.find((item) => item.id === preset)?.label;
    if (label) return `${label} (${formatExportPeriodLabel(from, to)})`;
  }
  return formatExportPeriodLabel(from, to);
}
