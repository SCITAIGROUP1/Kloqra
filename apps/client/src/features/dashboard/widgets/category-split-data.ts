import type { TaskDto, TimeLogDto } from "@kloqra/contracts";
import type { DashboardPeriodSelection } from "@kloqra/web-shared";

export const CATEGORY_SPLIT_PALETTE = [
  "hsl(221 83% 53%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 67% 58%)",
  "hsl(0 84% 60%)",
  "hsl(187 85% 43%)",
  "hsl(215 16% 55%)"
] as const;

export type CategorySplitRow = {
  id: string;
  categoryName: string;
  hours: number;
  percentage: number;
  color: string;
};

export type CategorySplitChartRow = CategorySplitRow & {
  name: string;
  value: number;
  fill: string;
  configKey: string;
};

export type CategorySplitData = {
  rows: CategorySplitRow[];
  chartRows: CategorySplitChartRow[];
  totalHours: number;
};

export function buildCategorySplitData(logs: TimeLogDto[], tasks: TaskDto[]): CategorySplitData {
  const byCategory = new Map<string, { name: string; seconds: number }>();
  let totalSec = 0;

  for (const log of logs) {
    const task = tasks.find((t) => t.id === log.taskId);
    const catId = task?.categoryId ?? "uncategorized";
    const catName = task?.categoryName ?? "Uncategorized";

    const prev = byCategory.get(catId) ?? { name: catName, seconds: 0 };
    byCategory.set(catId, {
      name: prev.name,
      seconds: prev.seconds + log.durationSec
    });
    totalSec += log.durationSec;
  }

  const sorted = Array.from(byCategory.entries())
    .map(([id, val]) => ({ id, name: val.name, seconds: val.seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  const totalHours = totalSec / 3600;
  const rows: CategorySplitRow[] = sorted.map((item, idx) => {
    const hours = item.seconds / 3600;
    const percentage = totalHours > 0 ? Math.round((hours / totalHours) * 1000) / 10 : 0;
    const color = CATEGORY_SPLIT_PALETTE[idx % CATEGORY_SPLIT_PALETTE.length] || "hsl(215 16% 55%)";

    return {
      id: item.id,
      categoryName: item.name,
      hours,
      percentage,
      color
    };
  });

  const chartRows: CategorySplitChartRow[] = rows.map((row, idx) => ({
    ...row,
    name: row.categoryName,
    value: row.hours,
    fill: row.color,
    configKey: `category_${idx}`
  }));

  return { rows, chartRows, totalHours };
}

export function categorySplitPeriodLabel(range: DashboardPeriodSelection): string {
  switch (range) {
    case "today":
      return "Today";
    case "week":
      return "This week";
    case "month":
      return "This month";
    case "all":
      return "All time";
    default:
      return "Period";
  }
}
