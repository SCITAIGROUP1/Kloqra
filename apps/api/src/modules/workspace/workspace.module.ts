import { Module } from "@nestjs/common";
import { AccessModule } from "../../common/access/access.module";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PresenceModule } from "../presence/presence.module";
import { QueuesModule } from "../queues/queues.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { WorkspaceMembersOverviewService } from "./application/workspace-members-overview.service";
import { WorkspaceProjectManagersOverviewService } from "./application/workspace-project-managers-overview.service";
import { WorkspaceTeamActivitiesService } from "./application/workspace-team-activities.service";
import { WorkspaceService } from "./application/workspace.service";
import { WorkspaceController } from "./interface/http/workspace.controller";

@Module({
  imports: [
    AuthModule,
    AccessModule,
    SubscriptionsModule,
    TimeModule,
    PresenceModule,
    NotificationsModule,
    QueuesModule
  ],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    WorkspaceMembersOverviewService,
    WorkspaceProjectManagersOverviewService,
    WorkspaceTeamActivitiesService
  ],
  exports: [WorkspaceService]
})
export class WorkspaceModule {}
