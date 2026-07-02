import {
  DEFAULT_PRICING_BASELINE_FEATURES,
  type PlatformCatalogSettingsDto,
  type UpdatePlatformCatalogSettingsDto
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { PlatformAuditService, type PlatformAuditContext } from "./platform-audit.service";

function parseBaselineFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_PRICING_BASELINE_FEATURES];
  return raw.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
  );
}

@Injectable()
export class PlatformCatalogSettingsService {
  constructor(
    private prisma: PrismaService,
    private audit: PlatformAuditService
  ) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  async getSettings(): Promise<PlatformCatalogSettingsDto> {
    const row = await this.db().platformCatalogSettings.findUnique({ where: { id: 1 } });
    return {
      pricingBaselineFeatures: parseBaselineFeatures(row?.pricingBaselineFeatures)
    };
  }

  async getBaselineFeatures(): Promise<string[]> {
    const settings = await this.getSettings();
    return settings.pricingBaselineFeatures;
  }

  async updateSettings(
    dto: UpdatePlatformCatalogSettingsDto,
    ctx: PlatformAuditContext
  ): Promise<PlatformCatalogSettingsDto> {
    const pricingBaselineFeatures = dto.pricingBaselineFeatures
      .map((line) => line.trim())
      .filter(Boolean);

    await this.db().platformCatalogSettings.upsert({
      where: { id: 1 },
      create: { id: 1, pricingBaselineFeatures },
      update: { pricingBaselineFeatures }
    });

    await this.audit.recordEvent({
      context: ctx,
      action: "platform.catalog_settings.updated",
      summary: {
        pricingBaselineFeatureCount: pricingBaselineFeatures.length
      }
    });

    return { pricingBaselineFeatures };
  }
}
