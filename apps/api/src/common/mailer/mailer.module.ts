import { Global, Module } from "@nestjs/common";
import { AuthMailer } from "./auth.mailer";
import { BillingMailer } from "./billing.mailer";
import { MailerService } from "./mailer.service";
import { MemberProvisioningMailer } from "./member-provisioning.mailer";
import { TenantOwnerProvisioningMailer } from "./tenant-owner-provisioning.mailer";

/**
 * Global module — import once in AppModule to make MailerService injectable everywhere.
 */
@Global()
@Module({
  providers: [
    MailerService,
    MemberProvisioningMailer,
    TenantOwnerProvisioningMailer,
    AuthMailer,
    BillingMailer
  ],
  exports: [
    MailerService,
    MemberProvisioningMailer,
    TenantOwnerProvisioningMailer,
    AuthMailer,
    BillingMailer
  ]
})
export class MailerModule {}
