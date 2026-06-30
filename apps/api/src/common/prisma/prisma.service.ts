import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    if (!process.env.DATABASE_URL?.trim()) {
      this.logger.warn(
        "DATABASE_URL is not set — skipping DB connect. Add it on the Railway API service and redeploy."
      );
      return;
    }
    try {
      await this.$connect();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Database connection failed: ${message}`);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
