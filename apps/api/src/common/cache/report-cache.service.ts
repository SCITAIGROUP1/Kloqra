import type { DashboardReportDto, TenantAnalyticsSummaryDto } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { RedisService, type RedisClient } from "../redis/redis.service";

const DASHBOARD_TTL_SEC = 120;

@Injectable()
export class ReportCacheService {
  constructor(private redis: RedisService) {}

  dashboardKey(
    workspaceId: string,
    from: string,
    to: string,
    userId?: string | string[],
    projectId?: string | string[],
    categoryId?: string,
    taskId?: string,
    projectIds?: string[]
  ) {
    const userIdKey = Array.isArray(userId) ? [...userId].sort().join(",") : (userId ?? "");
    const projectIdKey = Array.isArray(projectId)
      ? [...projectId].sort().join(",")
      : (projectId ?? "");
    const projectIdsKey =
      projectIds !== undefined
        ? projectIds.length
          ? [...projectIds].sort().join(",")
          : "__none__"
        : "";
    return `report:dashboard:${workspaceId}:${from}:${to}:${userIdKey}:${projectIdKey}:${categoryId ?? ""}:${taskId ?? ""}:${projectIdsKey}`;
  }

  async getDashboard(key: string): Promise<DashboardReportDto | null> {
    const raw = await this.getClient().get(key);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardReportDto;
  }

  async setDashboard(key: string, _workspaceId: string, data: DashboardReportDto) {
    const payload = JSON.stringify(data);
    const client = this.getClient();
    if ("setex" in client && typeof client.setex === "function") {
      await client.setex(key, DASHBOARD_TTL_SEC, payload);
    } else {
      await client.set(key, payload);
    }
  }

  async invalidateWorkspace(workspaceId: string) {
    const client = this.getClient();
    let cursor = "0";
    do {
      const [nextCursor, keys] = (await client.scan(
        cursor,
        "MATCH",
        `report:*:${workspaceId}:*`,
        "COUNT",
        100
      )) as [string, string[]];
      cursor = nextCursor;
      if (keys.length > 0) {
        for (const key of keys) {
          await client.del(key);
        }
      }
    } while (cursor !== "0");
  }

  billingKey(
    workspaceId: string,
    from: string,
    to: string,
    userId?: string | string[],
    projectId?: string | string[]
  ) {
    const userIdKey = Array.isArray(userId) ? [...userId].sort().join(",") : (userId ?? "");
    const projectIdKey = Array.isArray(projectId)
      ? [...projectId].sort().join(",")
      : (projectId ?? "");
    return `report:billing:${workspaceId}:${from}:${to}:${userIdKey}:${projectIdKey}`;
  }

  async getBilling(key: string): Promise<any | null> {
    const raw = await this.getClient().get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async setBilling(key: string, _workspaceId: string, data: any) {
    const payload = JSON.stringify(data);
    const client = this.getClient();
    if ("setex" in client && typeof client.setex === "function") {
      await client.setex(key, DASHBOARD_TTL_SEC, payload);
    } else {
      await client.set(key, payload);
    }
  }

  tenantRollupKey(tenantId: string, from: string, to: string) {
    return `report:tenant-rollup:${tenantId}:${from}:${to}`;
  }

  async getTenantRollup(key: string): Promise<TenantAnalyticsSummaryDto | null> {
    const raw = await this.getClient().get(key);
    if (!raw) return null;
    return JSON.parse(raw) as TenantAnalyticsSummaryDto;
  }

  async setTenantRollup(key: string, _tenantId: string, data: TenantAnalyticsSummaryDto) {
    const payload = JSON.stringify(data);
    const client = this.getClient();
    if ("setex" in client && typeof client.setex === "function") {
      await client.setex(key, DASHBOARD_TTL_SEC, payload);
    } else {
      await client.set(key, payload);
    }
  }

  private getClient(): RedisClient {
    return this.redis.getClient();
  }
}
