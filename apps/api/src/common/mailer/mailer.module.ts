import { Global, Module } from "@nestjs/common";
import { MailerService } from "./mailer.service";

/**
 * Global module — import once in AppModule to make MailerService injectable everywhere.
 */
@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService]
})
export class MailerModule {}
