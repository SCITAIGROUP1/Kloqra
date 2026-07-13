/**
 * Client commercial features: rates, revenue amounts, invoices, project hour budgets.
 * Does NOT gate SaaS subscription billing or TimeLog/Task billable flags.
 *
 * Default ON. Set NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES=false for UAT
 * (pair with API CLIENT_COMMERCIAL_FEATURES_ENABLED=false).
 */
export function isClientCommercialFeaturesEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES;
  if (raw === undefined) return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== "false" && normalized !== "0";
}

/** Admin dashboard widgets that require commercial features. */
export const COMMERCIAL_DASHBOARD_WIDGET_IDS = [
  "stat_revenue",
  "revenue_trend",
  "revenue_by_project",
  "budget_burndown",
  "project_health",
  "rate_efficiency",
  "hourly_rates"
] as const;

/** Account overview widgets that require commercial features. */
export const COMMERCIAL_ACCOUNT_WIDGET_IDS = ["kpi_billable_amount", "chart_revenue"] as const;
