import { Global, Module } from "@nestjs/common";
import { AuthMailer } from "./auth.mailer";
import { MailerService } from "./mailer.service";
import { MemberProvisioningMailer } from "./member-provisioning.mailer";

/**
 * Global module — import once in AppModule to make MailerService injectable everywhere.
 */
@Global()
@Module({
  providers: [MailerService, MemberProvisioningMailer, AuthMailer],
  exports: [MailerService, MemberProvisioningMailer, AuthMailer]
})
export class MailerModule {}
