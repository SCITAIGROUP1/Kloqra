import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "../../common/queues";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { BulkCategoryWorker } from "./workers/bulk-category.worker";
import { BulkInviteWorker } from "./workers/bulk-invite.worker";
import { MailWorker } from "./workers/mail.worker";

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.MAIL,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    }),
    BullModule.registerQueue({
      name: QUEUES.BULK_INVITE
    }),
    BullModule.registerQueue({
      name: QUEUES.BULK_CATEGORY
    }),
    AuthModule,
    NotificationsModule
  ],
  providers: [MailWorker, BulkInviteWorker, BulkCategoryWorker],
  exports: [BullModule]
})
export class QueuesModule {}
