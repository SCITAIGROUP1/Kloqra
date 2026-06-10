import { toDateInputValue } from "@kloqra/web-shared";

export type DatePreset = "today" | "week" | "7d" | "30d" | "90d" | "month";

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
