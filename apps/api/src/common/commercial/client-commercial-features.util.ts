/**
 * Client commercial features: hourly rates, revenue amounts, invoices, project hour budgets.
 * Does NOT gate SaaS subscription billing or TimeLog/Task billable flags.
 *
 * Default ON (production-safe). Set CLIENT_COMMERCIAL_FEATURES_ENABLED=false for UAT.
 */
export function isClientCommercialFeaturesEnabled(): boolean {
  const raw = process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED;
  if (raw === undefined) return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== "false" && normalized !== "0";
}
