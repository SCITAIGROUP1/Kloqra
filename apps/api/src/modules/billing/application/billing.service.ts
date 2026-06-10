import type { CreateHourlyRateDto, ListHourlyRatesQuery, ReportQueryDto } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { ReportCacheService } from "../../../common/cache/report-cache.service";
import { paginationSkipTake, toPaginatedResponse } from "../../../common/http/pagination.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { roundExport } from "../../../common/time/round.util";
import { TimeAggregationService } from "../../../common/time/time-aggregation.service";

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService,
    private reportCache: ReportCacheService
  ) {}

  async listRates(workspaceId: string, query: ListHourlyRatesQuery) {
    const where = {
      workspaceId,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.hourlyRate.count({ where }),
      this.prisma.hourlyRate.findMany({
        where,
        orderBy: { effectiveFrom: "desc" },
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    return toPaginatedResponse(
      rows.map((r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        userId: r.userId,
        projectId: r.projectId,
        rate: r.rate.toNumber(),
        effectiveFrom: r.effectiveFrom.toISOString()
      })),
      total,
      query.page,
      query.limit
    );
  }

  async createRate(workspaceId: string, dto: CreateHourlyRateDto) {
    const r = await this.prisma.hourlyRate.create({
      data: {
        workspaceId,
        userId: dto.userId,
        projectId: dto.projectId,
        rate: dto.rate,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date()
      }
    });
    await this.reportCache.invalidateWorkspace(workspaceId);
    return {
      id: r.id,
      workspaceId: r.workspaceId,
      userId: r.userId,
      projectId: r.projectId,
      rate: r.rate.toNumber(),
      effectiveFrom: r.effectiveFrom.toISOString()
    };
  }

  async summary(workspaceId: string, query: ReportQueryDto) {
    const cacheKey = this.reportCache.billingKey(
      workspaceId,
      query.from,
      query.to,
      query.userId,
      query.projectId
    );
    const cached = await this.reportCache.getBilling(cacheKey);
    if (cached) return cached;

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from: new Date(query.from),
      to: new Date(query.to),
      userId: query.userId,
      projectId: query.projectId
    });
    const { resolveRate } = await this.aggregation.resolveRateMaps(workspaceId);
    const { workspaceAgg } = this.aggregation.buildAggregates(logs, resolveRate);

    const result = {
      totalHours: roundExport(workspaceAgg.totalHours),
      billableHours: roundExport(workspaceAgg.billableHours),
      totalAmount: roundExport(workspaceAgg.billableAmount),
      currency: "USD" as const
    };

    await this.reportCache.setBilling(cacheKey, workspaceId, result);
    return result;
  }
}
