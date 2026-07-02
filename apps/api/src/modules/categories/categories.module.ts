import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { QueuesModule } from "../queues/queues.module";
import { CategoriesService } from "./application/categories.service";
import { CategoriesController } from "./interface/http/categories.controller";

@Module({
  imports: [AuthModule, QueuesModule, NotificationsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService]
})
export class CategoriesModule {}
