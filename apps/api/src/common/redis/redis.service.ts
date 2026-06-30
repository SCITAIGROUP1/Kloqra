import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { MemoryRedis } from "./memory-redis";

export type RedisClient = Redis | MemoryRedis;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: RedisClient | null = null;
  private readonly logger = new Logger(RedisService.name);

  getClient(): RedisClient {
    if (!this.client) {
      const useMemory =
        process.env.REDIS_USE_MEMORY === "true" || process.env.REDIS_URL === "memory";

      if (useMemory) {
        this.logger.log("Using in-memory Redis (no Docker required)");
        this.client = new MemoryRedis();
      } else {
        this.client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
      }
    }
    return this.client;
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }
}
