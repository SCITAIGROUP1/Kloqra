import { Module } from "@nestjs/common";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { PresenceModule } from "../presence/presence.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { WorkspaceModule } from "../workspace/workspace.module";
import { TenantAnalyticsService } from "./application/tenant-analytics.service";
import { TenantWorkspaceAdminsOverviewService } from "./application/tenant-workspace-admins-overview.service";
import { TenantsService } from "./application/tenants.service";
import { PublicTenantsController } from "./interface/http/public-tenants.controller";
import { TenantsController } from "./interface/http/tenants.controller";

@Module({
  imports: [AuthModule, WorkspaceModule, SubscriptionsModule, TimeModule, PresenceModule],
  controllers: [TenantsController, PublicTenantsController],
  providers: [TenantsService, TenantAnalyticsService, TenantWorkspaceAdminsOverviewService]
})
export class TenantsModule {}
