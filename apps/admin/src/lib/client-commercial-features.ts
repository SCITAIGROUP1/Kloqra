/**
 * Client commercial features UI: hourly rates, revenue amounts, invoices, project hour budgets.
 * Does NOT gate SaaS subscription billing or TimeLog/Task billable flags.
 *
 * Default ON. Set NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES=false for UAT (pair with API).
 * Keep in sync with `@kloqra/web-shared` `isClientCommercialFeaturesEnabled`.
 */
export function isClientCommercialFeaturesEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES;
  if (raw === undefined) return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== "false" && normalized !== "0";
}

export { COMMERCIAL_ACCOUNT_WIDGET_IDS, COMMERCIAL_DASHBOARD_WIDGET_IDS } from "@kloqra/web-shared";
