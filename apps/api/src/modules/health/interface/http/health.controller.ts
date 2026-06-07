import { ROUTES } from "@chronomint/contracts";
import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";

const START_TIME = Date.now();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_VERSION: string = (require("../../../../../package.json") as { version: string }).version;

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  @Get(ROUTES.HEALTH)
  async health() {
    const [dbStatus, redisStatus] = await Promise.all([this.checkDb(), this.checkRedis()]);

    const healthy = dbStatus === "ok" && redisStatus === "ok";

    return {
      status: healthy ? "ok" : "degraded",
      version: APP_VERSION,
      uptimeSec: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        redis: redisStatus
      }
    };
  }

  private async checkDb(): Promise<"ok" | "error"> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "error";
    }
  }

  private async checkRedis(): Promise<"ok" | "error"> {
    try {
      const result = await this.redis.getClient().ping();
      return result === "PONG" ? "ok" : "error";
    } catch {
      return "error";
    }
  }
}
