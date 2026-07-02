import { buildPlanDisplayFeatures, type PlanCatalogItemDto } from "@kloqra/contracts";
import { buildPricingTiersFromCatalog, type PlanPricingTier } from "@kloqra/web-shared";

export function parseBaselineFeatures(text: string, fallback: readonly string[]): string[] {
  const parsed = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...fallback];
}

export function buildPlanPricingPreview(
  plans: PlanCatalogItemDto[],
  baselineFeatures: readonly string[],
  options?: { visibleOnly?: boolean }
): PlanPricingTier[] {
  const visibleOnly = options?.visibleOnly ?? true;
  const items = (visibleOnly ? plans.filter((plan) => plan.visibleOnPricing) : plans).map(
    (plan) => ({
      ...plan,
      displayFeatures: buildPlanDisplayFeatures(plan, baselineFeatures)
    })
  );

  return buildPricingTiersFromCatalog({
    baselineFeatures: [...baselineFeatures],
    items
  });
}

export function buildSinglePlanPreview(
  plan: PlanCatalogItemDto,
  baselineFeatures: readonly string[]
): PlanPricingTier | null {
  const tiers = buildPlanPricingPreview([plan], baselineFeatures, { visibleOnly: false });
  return tiers[0] ?? null;
}
