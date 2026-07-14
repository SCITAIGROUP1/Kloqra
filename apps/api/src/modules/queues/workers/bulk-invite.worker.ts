import type { InviteMemberDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { Processor, WorkerHost, InjectQueue } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { generateTempPassword, hashPassword } from "../../../common/auth/password.util";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
import { assertUserNotInOtherTenant } from "../../../common/tenant/tenant-context";
// eslint-disable-next-line no-restricted-imports
import { AuthService } from "../../auth/application/auth.service";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";
import { splitDisplayName } from "../../users/application/user-name.util";

export interface BulkInviteJobPayload {
  workspaceId: string;
  members: InviteMemberDto[];
  invitedByUserId: string;
}

@Processor(QUEUES.BULK_INVITE)
export class BulkInviteWorker extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly notificationsDispatch: NotificationsDispatchService,
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue
  ) {
    super();
  }

  async process(job: Job<BulkInviteJobPayload, any, string>): Promise<any> {
    const { workspaceId, members, invitedByUserId } = job.data;

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error("Workspace not found");

    const inviter = await this.prisma.user.findUnique({ where: { id: invitedByUserId } });
    const inviterName = inviter?.name;

    let successCount = 0;
    let skippedCount = 0;

    for (const memberDto of members) {
      const email = memberDto.email.trim().toLowerCase();

      let user = await this.prisma.user.findUnique({ where: { email } });
      let userCreated = false;
      let temporaryPassword: string | undefined;

      if (!user) {
        const displayName = memberDto.name.trim();
        const { firstName, lastName } = splitDisplayName(displayName);
        temporaryPassword = generateTempPassword();
        const passwordHash = await hashPassword(temporaryPassword);

        user = await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            name: displayName,
            firstName,
            lastName,
            mustChangePassword: true,
            emailVerifiedAt: null
          }
        });
        userCreated = true;
      } else {
        try {
          await assertUserNotInOtherTenant(this.prisma, user.id, (workspace as any).tenantId);
        } catch (err) {
          if (err instanceof DomainException && err.code === ErrorCodes.CONFLICT) {
            skippedCount++;
            continue;
          }
          throw err;
        }
      }

      const existing = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user.id } }
      });

      if (existing) {
        skippedCount++;
        continue; // Gracefully skip existing members
      }

      const membership = await this.prisma.workspaceMember.create({
        data: { workspaceId, userId: user.id, role: memberDto.role },
        include: { user: true }
      });

      successCount++;

      // Enqueue email job
      if (userCreated && temporaryPassword) {
        const inviteHandoff = await this.auth.prepareInviteHandoff(user.id, temporaryPassword);
        await this.mailQueue.add(
          "sendNewMemberCredentials",
          {
            type: "sendNewMemberCredentials",
            payload: {
              to: email,
              workspaceName: workspace.name,
              inviterName,
              temporaryPassword,
              inviteHandoffToken: inviteHandoff.inviteHandoffToken,
              role: memberDto.role
            }
          },
          { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
        );
      } else {
        await this.mailQueue.add(
          "sendWorkspaceAdded",
          {
            type: "sendWorkspaceAdded",
            payload: {
              to: email,
              workspaceName: workspace.name,
              inviterName,
              role: memberDto.role
            }
          },
          { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
        );
      }

      // Dispatch notifications
      void this.notificationsDispatch
        .notifyWorkspaceAdmins(workspaceId, {
          templateId: "member.joined",
          context: {
            memberName: membership.user.name,
            workspaceName: workspace.name,
            inviterName: inviterName
          }
        })
        .catch(() => undefined);

      void this.notificationsDispatch
        .notify({
          userId: user.id,
          workspaceId,
          templateId: "workspace.added",
          context: {
            workspaceName: workspace.name,
            inviterName
          }
        })
        .catch(() => undefined);
    }

    return { successCount, skippedCount, totalProcessed: members.length };
  }
}
