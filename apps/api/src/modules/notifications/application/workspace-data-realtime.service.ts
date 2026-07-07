import type { WorkspaceDataStaleEvent } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../common/redis/redis.service";
import { workspaceDataUserChannel } from "./workspace-data-realtime.constants.js";

@Injectable()
export class WorkspaceDataRealtimeService {
  constructor(private redis: RedisService) {}

  async publishStale(userId: string, payload: WorkspaceDataStaleEvent): Promise<void> {
    await this.redis.getClient().publish(workspaceDataUserChannel(userId), JSON.stringify(payload));
  }

  async publishStaleToUsers(userIds: string[], payload: WorkspaceDataStaleEvent): Promise<void> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return;
    const body = JSON.stringify(payload);
    await Promise.all(
      unique.map((userId) => this.redis.getClient().publish(workspaceDataUserChannel(userId), body))
    );
  }
}
