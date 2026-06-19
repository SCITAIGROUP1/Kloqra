import { localMidnightUtcInZone } from "@kloqra/web-shared";

export function buildWidgetShareDateRange(startDate: string, endDate: string, timezone?: string) {
  const effectiveTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [fy, fm, fd] = startDate.split("-").map(Number);
  const [ty, tm, td] = endDate.split("-").map(Number);
  const from = localMidnightUtcInZone(fy, fm, fd, effectiveTz);
  const to = new Date(
    localMidnightUtcInZone(ty, tm, td, effectiveTz).getTime() + 24 * 60 * 60 * 1000 - 1
  );
  return { from: from.toISOString(), to: to.toISOString() };
}

export function widgetShareOptionsForId(
  widgetId: string,
  state: {
    dailyChartBy: string;
    breakdownGroupBy: string;
    distributionGroupBy: string;
  }
): Record<string, unknown> | undefined {
  switch (widgetId) {
    case "daily_chart":
      return { chartBy: state.dailyChartBy };
    case "breakdown_table":
      return { groupBy: state.breakdownGroupBy };
    case "distribution_donut":
      return { groupBy: state.distributionGroupBy };
    case "category_distribution":
    case "category_breakdown":
      return { groupBy: "category" };
    default:
      return undefined;
  }
}
