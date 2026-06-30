import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { MemberProvisioningMailer } from "../../../common/mailer/member-provisioning.mailer";
import { QUEUES } from "../../../common/queues";

@Processor(QUEUES.MAIL)
export class MailWorker extends WorkerHost {
  constructor(private readonly memberMailer: MemberProvisioningMailer) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { type, payload } = job.data;

    switch (type) {
      case "sendNewMemberCredentials": {
        const result = await this.memberMailer.sendNewMemberCredentials(payload);
        if (!result.sent && result.reason === "failed") {
          throw new Error(`Email failed: ${result.detail || "Unknown SMTP error"}`);
        }
        return { ok: true, emailSent: result.sent, reason: result.reason };
      }
      case "sendWorkspaceAdded": {
        const result = await this.memberMailer.sendWorkspaceAdded(payload);
        if (!result.sent && result.reason === "failed") {
          throw new Error(`Email failed: ${result.detail || "Unknown SMTP error"}`);
        }
        return { ok: true, emailSent: result.sent, reason: result.reason };
      }
      default:
        throw new Error(`Unknown mail job type: ${type}`);
    }
  }
}
