import type { DashboardReportDto } from "@chronomint/contracts";
import { Injectable } from "@nestjs/common";
import { RedisService, type RedisClient } from "../redis/redis.service";

const DASHBOARD_TTL_SEC = 120;

@Injectable()
export class ReportCacheService {
  private readonly keysByWorkspace = new Map<string, Set<string>>();

  constructor(private redis: RedisService) {}

  dashboardKey(
    workspaceId: string,
    from: string,
    to: string,
    userId?: string,
    projectId?: string,
    categoryId?: string,
    taskId?: string
  ) {
    return `report:dashboard:${workspaceId}:${from}:${to}:${userId ?? ""}:${projectId ?? ""}:${categoryId ?? ""}:${taskId ?? ""}`;
  }

  async getDashboard(key: string): Promise<DashboardReportDto | null> {
    const raw = await this.getClient().get(key);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardReportDto;
  }

  async setDashboard(key: string, workspaceId: string, data: DashboardReportDto) {
    const payload = JSON.stringify(data);
    const client = this.getClient();
    if ("setex" in client && typeof client.setex === "function") {
      await client.setex(key, DASHBOARD_TTL_SEC, payload);
    } else {
      await client.set(key, payload);
    }
    const keys = this.keysByWorkspace.get(workspaceId) ?? new Set();
    keys.add(key);
    this.keysByWorkspace.set(workspaceId, keys);
  }

  async invalidateWorkspace(workspaceId: string) {
    const keys = this.keysByWorkspace.get(workspaceId);
    if (!keys?.size) return;
    const client = this.getClient();
    for (const key of keys) {
      await client.del(key);
    }
    keys.clear();
  }

  billingKey(workspaceId: string, from: string, to: string, userId?: string, projectId?: string) {
    return `report:billing:${workspaceId}:${from}:${to}:${userId ?? ""}:${projectId ?? ""}`;
  }

  async getBilling(key: string): Promise<any | null> {
    const raw = await this.getClient().get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async setBilling(key: string, workspaceId: string, data: any) {
    const payload = JSON.stringify(data);
    const client = this.getClient();
    if ("setex" in client && typeof client.setex === "function") {
      await client.setex(key, DASHBOARD_TTL_SEC, payload);
    } else {
      await client.set(key, payload);
    }
    const keys = this.keysByWorkspace.get(workspaceId) ?? new Set();
    keys.add(key);
    this.keysByWorkspace.set(workspaceId, keys);
  }

  private getClient(): RedisClient {
    return this.redis.getClient();
  }
}
