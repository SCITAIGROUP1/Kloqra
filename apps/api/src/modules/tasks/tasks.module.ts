import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";
import { TasksService } from "./application/tasks.service";
import { TasksController } from "./interface/http/tasks.controller";

@Module({
  imports: [AuthModule, ProjectsModule, NotificationsModule],
  controllers: [TasksController],
  providers: [TasksService]
})
export class TasksModule {}
