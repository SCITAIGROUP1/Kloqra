import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { RedisService } from "../../../common/redis/redis.service";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 20;

@Injectable()
export class AssistantRateLimitService {
  constructor(private redis: RedisService) {}

  async assertWithinLimit(userId: string): Promise<void> {
    const key = `assistant:rl:sliding:${userId}`;
    const client = this.redis.getClient();
    const now = Date.now();
    const windowStart = now - WINDOW_SECONDS * 1000;

    const multi = client.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, WINDOW_SECONDS);

    const results = await multi.exec();
    if (!results) {
      throw new Error("Redis multi command failed");
    }

    // Extract ZCARD count
    const zcardResult = results[2];
    const count = Array.isArray(zcardResult) ? (zcardResult[1] as number) : (zcardResult as number);

    if (count > MAX_REQUESTS) {
      throw new HttpException(
        {
          code: "VALIDATION_ERROR",
          message: "Too many assistant requests. Please wait a moment and try again."
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }
}
