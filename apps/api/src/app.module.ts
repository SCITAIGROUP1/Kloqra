import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "./common/cache/cache.module";
import { CustomThrottlerGuard } from "./common/guards/custom-throttler.guard";
import { RequestLoggerMiddleware } from "./common/logger/request-logger.middleware";
import { MailerModule } from "./common/mailer/mailer.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { AssistantModule } from "./modules/assistant/assistant.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BillingModule } from "./modules/billing/billing.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { ExportModule } from "./modules/export/export.module";
import { HealthModule } from "./modules/health/health.module";
import { JiraModule } from "./modules/jira/jira.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PresenceModule } from "./modules/presence/presence.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { PublicReportingModule } from "./modules/public-reporting/public-reporting.module";
import { ReportingModule } from "./modules/reporting/reporting.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { TimelogsModule } from "./modules/timelogs/timelogs.module";
import { TimerModule } from "./modules/timer/timer.module";
import { UsersModule } from "./modules/users/users.module";
import { WorkspaceModule } from "./modules/workspace/workspace.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000, // 60 seconds
        limit: 300 // 300 requests per 60s globally
      },
      {
        name: "auth",
        ttl: 60_000,
        limit: 5 // 5 attempts per 60s for auth endpoints
      }
    ]),
    PrismaModule,
    RedisModule,
    CacheModule,
    MailerModule,
    HealthModule,
    AssistantModule,
    AuthModule,
    UsersModule,
    WorkspaceModule,
    ProjectsModule,
    CategoriesModule,
    TasksModule,
    TimelogsModule,
    TimerModule,
    BillingModule,
    ReportingModule,
    PublicReportingModule,
    PresenceModule,
    ExportModule,
    NotificationsModule,
    JiraModule
  ],
  providers: [
    {
      // Apply CustomThrottlerGuard globally via DI so it has access to ThrottlerStorage
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
