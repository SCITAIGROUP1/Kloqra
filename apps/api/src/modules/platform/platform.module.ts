import { BullModule } from "@nestjs/bullmq";
import { Module, forwardRef } from "@nestjs/common";
import { PlatformJwtAuthGuard } from "../../common/guards/platform-jwt-auth.guard";
import { PlatformGuard } from "../../common/guards/platform.guard";
import { MailerModule } from "../../common/mailer/mailer.module";
import { NotificationMailer } from "../../common/mailer/notification.mailer";
import { QUEUES } from "../../common/queues";
import { RedisModule } from "../../common/redis/redis.module";
import { TenantProvisioningModule } from "../../common/tenant/tenant-provisioning.module";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { PlatformCatalogSettingsService } from "./application/platform-catalog-settings.service";
import { PlatformNotificationsDispatchService } from "./application/platform-notifications-dispatch.service";
import { PlatformNotificationsRealtimeService } from "./application/platform-notifications-realtime.service";
import { PlatformNotificationsService } from "./application/platform-notifications.service";
import { PlatformOpsService } from "./application/platform-ops.service";
import { PlatformPlansService } from "./application/platform-plans.service";
import { PlatformSubscriptionsService } from "./application/platform-subscriptions.service";
import { PlatformTenantsService } from "./application/platform-tenants.service";
import { PlatformUsers2faService } from "./application/platform-users-2fa.service";
import { PlatformUsersSessionsService } from "./application/platform-users-sessions.service";
import { PlatformUsersService } from "./application/platform-users.service";
import { PlatformAuditController } from "./interface/http/platform-audit.controller";
import { PlatformCatalogSettingsController } from "./interface/http/platform-catalog-settings.controller";
import { PlatformNotificationsController } from "./interface/http/platform-notifications.controller";
import { PlatformOpsController } from "./interface/http/platform-ops.controller";
import { PlatformPlansController } from "./interface/http/platform-plans.controller";
import { PlatformSalesInquiriesController } from "./interface/http/platform-sales-inquiries.controller";
import { PlatformStaffController } from "./interface/http/platform-staff.controller";
import { PlatformSubscriptionsController } from "./interface/http/platform-subscriptions.controller";
import { PlatformTenantsController } from "./interface/http/platform-tenants.controller";
import { PlatformUsersController } from "./interface/http/platform-users.controller";
import { PlatformAuditModule } from "./platform-audit.module";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => SubscriptionsModule),
    PlatformAuditModule,
    TenantProvisioningModule,
    MailerModule,
    RedisModule,
    BullModule.registerQueue(
      { name: QUEUES.MAIL },
      { name: QUEUES.BULK_INVITE },
      { name: QUEUES.BULK_CATEGORY },
      { name: QUEUES.EXPORT }
    )
  ],
  controllers: [
    PlatformTenantsController,
    PlatformSalesInquiriesController,
    PlatformPlansController,
    PlatformSubscriptionsController,
    PlatformCatalogSettingsController,
    PlatformAuditController,
    PlatformOpsController,
    PlatformUsersController,
    PlatformStaffController,
    PlatformNotificationsController
  ],
  providers: [
    PlatformTenantsService,
    PlatformPlansService,
    PlatformSubscriptionsService,
    PlatformCatalogSettingsService,
    PlatformOpsService,
    PlatformUsersService,
    PlatformUsers2faService,
    PlatformUsersSessionsService,
    PlatformNotificationsService,
    PlatformNotificationsRealtimeService,
    PlatformNotificationsDispatchService,
    NotificationMailer,
    PlatformGuard,
    PlatformJwtAuthGuard
  ],
  exports: [
    PlatformTenantsService,
    PlatformSubscriptionsService,
    PlatformOpsService,
    PlatformNotificationsDispatchService,
    PlatformNotificationsRealtimeService
  ]
})
export class PlatformModule {}
