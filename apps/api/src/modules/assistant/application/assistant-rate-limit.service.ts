import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { RedisService } from "../../../common/redis/redis.service";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 20;

@Injectable()
export class AssistantRateLimitService {
  constructor(private redis: RedisService) {}

  async assertWithinLimit(userId: string): Promise<void> {
    const key = `assistant:rl:${userId}`;
    const client = this.redis.getClient();
    const raw = await client.get(key);
    const count = raw ? Number.parseInt(raw, 10) : 0;

    if (count >= MAX_REQUESTS) {
      throw new HttpException(
        {
          code: "VALIDATION_ERROR",
          message: "Too many assistant requests. Please wait a moment and try again."
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    if (count === 0) {
      await client.setex(key, WINDOW_SECONDS, "1");
    } else {
      await client.set(key, String(count + 1));
    }
  }
}
