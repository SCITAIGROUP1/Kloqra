import { Module } from "@nestjs/common";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PresenceModule } from "../presence/presence.module";
import { WorkspaceMembersOverviewService } from "./application/workspace-members-overview.service";
import { WorkspaceService } from "./application/workspace.service";
import { WorkspaceController } from "./interface/http/workspace.controller";

@Module({
  imports: [AuthModule, TimeModule, PresenceModule, NotificationsModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceMembersOverviewService]
})
export class WorkspaceModule {}
