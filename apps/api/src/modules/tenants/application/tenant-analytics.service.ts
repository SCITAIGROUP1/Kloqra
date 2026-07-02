import type { TenantAnalyticsQueryDto, TenantAnalyticsSummaryDto } from "@kloqra/contracts";
import { resolveEffectiveCurrency } from "@kloqra/contracts";
import { Injectable, Logger } from "@nestjs/common";
import { ReportCacheService } from "../../../common/cache/report-cache.service";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { requireTenantOwnerInTenant } from "../../../common/tenant/tenant-context";
import { parseWorkspaceSettingsFromRaw } from "../../../common/time/approval-period.util";
import { roundExport } from "../../../common/time/round.util";
import { TimeAggregationService } from "../../../common/time/time-aggregation.service";

@Injectable()
export class TenantAnalyticsService {
  private readonly logger = new Logger(TenantAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService,
    private reportCache: ReportCacheService
  ) {}

  async getSummary(
    userId: string,
    tenantId: string,
    query: TenantAnalyticsQueryDto
  ): Promise<TenantAnalyticsSummaryDto> {
    await requireTenantOwnerInTenant(this.prisma, userId, tenantId);

    const cacheKey = this.reportCache.tenantRollupKey(tenantId, query.from, query.to);
    const cached = await this.reportCache.getTenantRollup(cacheKey);
    if (cached) return cached;

    const result = await this.buildSummary(tenantId, query);
    await this.reportCache.setTenantRollup(cacheKey, tenantId, result);
    return result;
  }

  private async buildSummary(
    tenantId: string,
    query: TenantAnalyticsQueryDto
  ): Promise<TenantAnalyticsSummaryDto> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const workspaces = await generatedPrisma(this.prisma).workspace.findMany({
      where: { tenantId },
      select: { id: true, name: true, settings: true },
      orderBy: { name: "asc" }
    });

    if (workspaces.length > 50 && (to.getTime() - from.getTime()) / 86_400_000 > 90) {
      this.logger.warn(
        `Tenant rollup query for ${tenantId} spans ${workspaces.length} workspaces and >90 days`
      );
    }

    const byWorkspace: TenantAnalyticsSummaryDto["byWorkspace"] = [];
    const allMemberIds = new Set<string>();
    let totalHours = 0;
    let billableHours = 0;
    let billableAmount = 0;
    let activeWorkspaces = 0;
    const currencies = new Set<string>();

    for (const workspace of workspaces) {
      const settings = parseWorkspaceSettingsFromRaw(workspace.settings);
      const currency = resolveEffectiveCurrency(settings);
      currencies.add(currency);

      const logs = await this.aggregation.fetchLogs(workspace.id, { from, to });
      const { resolveRate } = await this.aggregation.resolveRateMaps(workspace.id);
      const { workspaceAgg, byUser } = this.aggregation.buildAggregates(logs, resolveRate);

      if (workspaceAgg.totalHours > 0) {
        activeWorkspaces += 1;
      }

      for (const userId of byUser.keys()) {
        allMemberIds.add(userId);
      }

      totalHours += workspaceAgg.totalHours;
      billableHours += workspaceAgg.billableHours;
      billableAmount += workspaceAgg.billableAmount;

      const wsBillablePercent =
        workspaceAgg.totalHours > 0
          ? roundExport((workspaceAgg.billableHours / workspaceAgg.totalHours) * 100)
          : 0;

      byWorkspace.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        totalHours: roundExport(workspaceAgg.totalHours),
        billableHours: roundExport(workspaceAgg.billableHours),
        billableAmount: roundExport(workspaceAgg.billableAmount),
        billablePercent: wsBillablePercent,
        activeMembers: byUser.size,
        currency
      });
    }

    const primaryCurrency = [...currencies][0] ?? "USD";
    const mixedCurrency = currencies.size > 1;

    return {
      period: { from: query.from, to: query.to },
      totals: {
        totalHours: roundExport(totalHours),
        billableHours: roundExport(billableHours),
        billableAmount: roundExport(billableAmount),
        billablePercent: totalHours > 0 ? roundExport((billableHours / totalHours) * 100) : 0,
        activeMembers: allMemberIds.size,
        activeWorkspaces,
        currency: primaryCurrency,
        ...(mixedCurrency ? { mixedCurrency: true } : {})
      },
      byWorkspace
    };
  }
}
