import { Module } from "@nestjs/common";
import { RedisModule } from "../../common/redis/redis.module";
import { AuthModule } from "../auth/auth.module";
import { AssistantProxyService } from "./application/assistant-proxy.service";
import { AssistantRateLimitService } from "./application/assistant-rate-limit.service";
import { AssistantController } from "./interface/http/assistant.controller";

@Module({
  imports: [RedisModule, AuthModule],
  controllers: [AssistantController],
  providers: [AssistantProxyService, AssistantRateLimitService]
})
export class AssistantModule {}
