import type { PlanCatalogItemDto } from "./dto/plan.dto";
import { PLAN_SLUGS } from "./plan-catalog";

/** Default shared bullets shown on every paid pricing tier unless overridden in DB. */
export const DEFAULT_PRICING_BASELINE_FEATURES = [
  "Time tracking and timesheets",
  "Approval workflows",
  "Exports and reporting",
  "Mobile-friendly access"
] as const;

export type PlanDisplayFeaturesInput = Pick<
  PlanCatalogItemDto,
  "limits" | "features" | "billingMode" | "slug"
>;

function dedupeFeatures(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/** Compose pricing-card bullets: limits header + tier extras + shared baseline. */
export function buildPlanDisplayFeatures(
  plan: PlanDisplayFeaturesInput,
  baselineFeatures: readonly string[] = DEFAULT_PRICING_BASELINE_FEATURES
): string[] {
  const { maxSeats, maxWorkspaces, maxReportingApiKeys } = plan.limits;
  const head = [`Up to ${maxSeats} seats`, `Up to ${maxWorkspaces} workspaces`];
  const tierExtras = plan.features ?? [];

  if (plan.billingMode === "contact") {
    return dedupeFeatures([
      ...head,
      `Up to ${maxReportingApiKeys} reporting API keys`,
      ...tierExtras,
      ...baselineFeatures
    ]);
  }

  const baseline =
    plan.slug === PLAN_SLUGS.PRO
      ? baselineFeatures
      : baselineFeatures.filter((feature) => !tierExtras.includes(feature));

  return dedupeFeatures([...head, ...tierExtras, ...baseline]);
}
