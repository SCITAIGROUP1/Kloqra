import {
  buildPlanDisplayFeatures,
  DEFAULT_PRICING_BASELINE_FEATURES,
  type PlanPricingCatalogDto,
  type PublicPlanListDto
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { toPlanCatalogItem } from "../../../common/plan/plan-catalog.mapper";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";

function parseBaselineFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_PRICING_BASELINE_FEATURES];
  const parsed = raw.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
  );
  return parsed.length > 0 ? parsed : [...DEFAULT_PRICING_BASELINE_FEATURES];
}

@Injectable()
export class PublicPlansService {
  constructor(private prisma: PrismaService) {}

  async listPublicPlans(): Promise<PublicPlanListDto> {
    const plans = await generatedPrisma(this.prisma).plan.findMany({
      where: { isPublic: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    return {
      items: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        limits: toPlanCatalogItem(plan).limits
      }))
    };
  }

  async listPricingPlans(): Promise<PlanPricingCatalogDto> {
    const db = generatedPrisma(this.prisma);
    const [settings, plans] = await Promise.all([
      db.platformCatalogSettings.findUnique({ where: { id: 1 } }),
      db.plan.findMany({
        where: { visibleOnPricing: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      })
    ]);

    const baselineFeatures = parseBaselineFeatures(settings?.pricingBaselineFeatures);

    return {
      baselineFeatures,
      items: plans.map((plan) => {
        const item = toPlanCatalogItem(plan);
        return {
          ...item,
          displayFeatures: buildPlanDisplayFeatures(item, baselineFeatures)
        };
      })
    };
  }
}
