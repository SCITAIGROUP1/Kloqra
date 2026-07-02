import {
  ErrorCodes,
  type PlanCatalogListResponseDto,
  type PlatformPlanListResponseDto,
  type UpdatePlatformPlanDto
} from "@kloqra/contracts";
import { Injectable, NotFoundException } from "@nestjs/common";
import { toPlanCatalogItem } from "../../../common/plan/plan-catalog.mapper";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { PlatformAuditService, type PlatformAuditContext } from "./platform-audit.service";
import { PlatformCatalogSettingsService } from "./platform-catalog-settings.service";

@Injectable()
export class PlatformPlansService {
  constructor(
    private prisma: PrismaService,
    private audit: PlatformAuditService,
    private catalogSettings: PlatformCatalogSettingsService
  ) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  async listPlans(): Promise<PlatformPlanListResponseDto> {
    const [plans, settings] = await Promise.all([
      this.db().plan.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }),
      this.catalogSettings.getSettings()
    ]);
    return {
      items: plans.map(toPlanCatalogItem),
      pricingBaselineFeatures: settings.pricingBaselineFeatures
    };
  }

  async getPlan(id: string): Promise<PlanCatalogListResponseDto["items"][number]> {
    const plan = await this.db().plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Plan not found"
      });
    }
    return toPlanCatalogItem(plan);
  }

  async updatePlan(
    id: string,
    dto: UpdatePlatformPlanDto,
    ctx: PlatformAuditContext
  ): Promise<PlanCatalogListResponseDto["items"][number]> {
    const existing = await this.db().plan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Plan not found"
      });
    }

    const updated = await this.db().plan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.limits !== undefined ? { limits: dto.limits as object } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.stripeProductId !== undefined ? { stripeProductId: dto.stripeProductId } : {}),
        ...(dto.stripePriceId !== undefined ? { stripePriceId: dto.stripePriceId } : {}),
        ...(dto.tagline !== undefined ? { tagline: dto.tagline } : {}),
        ...(dto.monthlyPriceCents !== undefined
          ? { monthlyPriceCents: dto.monthlyPriceCents }
          : {}),
        ...(dto.yearlyPriceCents !== undefined ? { yearlyPriceCents: dto.yearlyPriceCents } : {}),
        ...(dto.features !== undefined ? { features: dto.features } : {}),
        ...(dto.recommended !== undefined ? { recommended: dto.recommended } : {}),
        ...(dto.billingMode !== undefined ? { billingMode: dto.billingMode } : {}),
        ...(dto.contactHref !== undefined ? { contactHref: dto.contactHref } : {}),
        ...(dto.visibleOnPricing !== undefined ? { visibleOnPricing: dto.visibleOnPricing } : {})
      }
    });

    await this.audit.recordEvent({
      context: ctx,
      action: "platform.plan.updated",
      summary: {
        planId: id,
        slug: updated.slug,
        changed: Object.keys(dto)
      }
    });

    return toPlanCatalogItem(updated);
  }
}
