import { ErrorCodes } from "@kloqra/contracts";
import type {
  InviteMemberDto,
  InviteMemberResponseDto,
  MemberEmailDeliveryDto,
  UpdateWorkspaceMemberDto,
  WorkspaceDto,
  WorkspaceListItemDto,
  WorkspaceMemberPickerDto,
  WorkspaceWithRoleDto,
  AssignWorkspaceAdminDto
} from "@kloqra/contracts";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, HttpStatus } from "@nestjs/common";
import { Queue } from "bullmq";
import * as ExcelJS from "exceljs";
import type { Response } from "express";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { generateTempPassword, hashPassword } from "../../../common/auth/password.util";
import { DomainException } from "../../../common/errors/domain.exception";
import { deliverMemberEmail } from "../../../common/mailer/member-email-delivery.util";
import { MemberProvisioningMailer } from "../../../common/mailer/member-provisioning.mailer";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
import {
  assertUserNotInOtherTenant,
  resolveUserTenantId,
  requireTenantOperator,
  requireTenantOwnerOrAdmin
} from "../../../common/tenant/tenant-context";
import {
  activeWorkspaceMemberWhere,
  toWorkspaceMemberWithUser,
  type WorkspaceMemberWithUser
} from "../../../common/workspace/workspace-member.types";
// eslint-disable-next-line no-restricted-imports
import { AuthService } from "../../auth/application/auth.service";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";
import { PlanLimitService } from "../../subscriptions/application/plan-limit.service";
import { splitDisplayName } from "../../users/application/user-name.util";

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private memberMailer: MemberProvisioningMailer,
    private notificationsDispatch: NotificationsDispatchService,
    private auth: AuthService,
    private planLimit: PlanLimitService,
    private projectAccess: ProjectAccessService,
    @InjectQueue(QUEUES.BULK_INVITE) private readonly bulkInviteQueue: Queue
  ) {}

  async listForUser(userId: string): Promise<WorkspaceListItemDto[]> {
    const tenantId = await resolveUserTenantId(this.prisma, userId);
    if (!tenantId) return [];

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId, workspace: { tenantId } as any },
      include: { workspace: true }
    });
    return Promise.all(
      memberships.map(async (m) => {
        const role = m.role as "ADMIN" | "MEMBER";
        const managedProjectIds =
          role === "MEMBER"
            ? await this.projectAccess.managedProjectIds(m.workspaceId, userId)
            : undefined;
        return this.toListItem(m.workspace, role, managedProjectIds);
      })
    );
  }

  async listForTenant(tenantId: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: { tenantId } as any,
      orderBy: { name: "asc" }
    });
    return workspaces.map((w) => ({
      id: w.id,
      name: w.name
    }));
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberPickerDto[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    });
    return members.map((m) => this.toMemberPickerDto(m));
  }

  async updateMember(
    workspaceId: string,
    memberId: string,
    dto: UpdateWorkspaceMemberDto,
    actingUserId: string
  ) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      // Acquire write-lock on the workspace row to prevent concurrent role changes/removals
      await tx.$queryRaw`SELECT 1 FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`;

      const foundMember = await tx.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        include: { user: true }
      });
      if (!foundMember) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Workspace member not found",
          HttpStatus.NOT_FOUND
        );
      }
      const member = toWorkspaceMemberWithUser(foundMember);

      const nextRole = dto.role ?? (member.role as "ADMIN" | "MEMBER");
      const nextIsActive = dto.isActive ?? member.isActive;

      if (dto.isActive === false && member.userId === actingUserId) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "Cannot deactivate yourself",
          HttpStatus.FORBIDDEN
        );
      }

      if (nextRole === member.role && nextIsActive === member.isActive) {
        return { kind: "unchanged" as const, member: this.toMemberDto(member) };
      }

      if (member.role === "ADMIN" && nextRole === "MEMBER") {
        const adminCount = await tx.workspaceMember.count({
          where: activeWorkspaceMemberWhere({ workspaceId, role: "ADMIN" })
        });
        if (adminCount <= 1) {
          throw new DomainException(
            ErrorCodes.FORBIDDEN,
            "Cannot demote the last workspace admin",
            HttpStatus.FORBIDDEN
          );
        }
      }

      if (member.role === "ADMIN" && nextIsActive === false) {
        const activeAdminCount = await tx.workspaceMember.count({
          where: activeWorkspaceMemberWhere({ workspaceId, role: "ADMIN" })
        });
        if (activeAdminCount <= 1) {
          throw new DomainException(
            ErrorCodes.FORBIDDEN,
            "Cannot deactivate the last workspace admin",
            HttpStatus.FORBIDDEN
          );
        }
      }

      const updated = toWorkspaceMemberWithUser(
        await tx.workspaceMember.update({
          where: { id: memberId },
          data: {
            ...(dto.role !== undefined ? { role: dto.role } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
          },
          include: { user: true }
        })
      );

      if (dto.isActive === false && member.isActive) {
        await tx.teamMember.updateMany({
          where: {
            userId: member.userId,
            team: {
              project: {
                workspaceId
              }
            }
          },
          data: {
            isActive: false
          }
        });
      }

      const roleChanged = dto.role !== undefined && dto.role !== member.role;
      const statusChanged = dto.isActive !== undefined && dto.isActive !== member.isActive;

      return {
        kind: roleChanged ? ("roleChanged" as const) : ("statusChanged" as const),
        member: this.toMemberDto(updated),
        newRole: roleChanged ? dto.role! : undefined,
        statusChanged
      };
    });

    if (outcome.kind === "roleChanged" && outcome.newRole) {
      const [workspace, actor] = await Promise.all([
        this.prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { name: true }
        }),
        this.prisma.user.findUnique({
          where: { id: actingUserId },
          select: { name: true }
        })
      ]);
      const workspaceName = workspace?.name ?? "the workspace";
      const actorName = actor?.name;

      void this.notificationsDispatch
        .notify({
          userId: outcome.member.userId,
          workspaceId,
          templateId: "member.roleChanged",
          context: {
            workspaceName,
            newRole: outcome.newRole,
            actorName
          }
        })
        .catch(() => undefined);

      void this.notificationsDispatch
        .notifyWorkspaceAdmins(workspaceId, {
          templateId: "member.roleUpdated",
          context: {
            memberName: outcome.member.userName,
            workspaceName,
            newRole: outcome.newRole,
            actorName
          }
        })
        .catch(() => undefined);
    }

    return outcome.member;
  }

  async removeMember(workspaceId: string, memberId: string, actingUserId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Acquire write-lock on the workspace row to prevent concurrent role changes/removals
      await tx.$queryRaw`SELECT 1 FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`;

      const member = await tx.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        include: { user: true }
      });
      if (!member) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Workspace member not found",
          HttpStatus.NOT_FOUND
        );
      }

      if (member.userId === actingUserId) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "Cannot remove yourself from the workspace",
          HttpStatus.FORBIDDEN
        );
      }

      if (member.role === "ADMIN") {
        const adminCount = await tx.workspaceMember.count({
          where: { workspaceId, role: "ADMIN" }
        });
        if (adminCount <= 1) {
          throw new DomainException(
            ErrorCodes.FORBIDDEN,
            "Cannot remove the last workspace admin",
            HttpStatus.FORBIDDEN
          );
        }
      }

      const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } });

      // Cascade delete TeamMember rows for the removed member in this workspace
      await tx.teamMember.deleteMany({
        where: {
          userId: member.userId,
          team: {
            project: {
              workspaceId
            }
          }
        }
      });

      await tx.workspaceMember.delete({ where: { id: memberId } });

      return { member, workspace };
    });

    const { member, workspace } = result;

    const actor = await this.prisma.user.findUnique({
      where: { id: actingUserId },
      select: { name: true }
    });
    void this.notificationsDispatch
      .notifyWorkspaceAdmins(workspaceId, {
        templateId: "member.removed",
        context: {
          memberName: member.user.name,
          workspaceName: workspace?.name ?? "the workspace",
          actorName: actor?.name
        }
      })
      .catch(() => undefined);

    void this.notificationsDispatch
      .notify({
        userId: member.userId,
        workspaceId,
        templateId: "workspace.removed",
        context: {
          workspaceName: workspace?.name ?? "the workspace",
          actorName: actor?.name
        }
      })
      .catch(() => undefined);

    return { ok: true as const };
  }

  async invite(
    workspaceId: string,
    dto: InviteMemberDto,
    invitedByUserId: string
  ): Promise<InviteMemberResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }

    await this.planLimit.assertSeatsForEmails((workspace as any).tenantId, [email]);

    const inviter = await this.prisma.user.findUnique({ where: { id: invitedByUserId } });
    const inviterName = inviter?.name;

    let user = await this.prisma.user.findUnique({ where: { email } });
    let userCreated = false;
    let temporaryPassword: string | undefined;

    if (!user) {
      const displayName = dto.name.trim();
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
      await assertUserNotInOtherTenant(this.prisma, user.id, (workspace as any).tenantId);
    }

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.MEMBER_ALREADY_EXISTS,
        "Already a member of this workspace",
        HttpStatus.CONFLICT
      );
    }

    const membership = await this.prisma.workspaceMember.create({
      data: { workspaceId, userId: user.id, role: dto.role },
      include: { user: true }
    });

    const inviteHandoff =
      userCreated && temporaryPassword
        ? await this.auth.prepareInviteHandoff(user.id, temporaryPassword)
        : undefined;

    const emailDelivery = await deliverMemberEmail(this.memberMailer.isConfigured, () =>
      userCreated && temporaryPassword && inviteHandoff
        ? this.memberMailer.sendNewMemberCredentials({
            to: email,
            workspaceName: workspace.name,
            inviterName,
            temporaryPassword,
            inviteHandoffToken: inviteHandoff.inviteHandoffToken,
            role: dto.role
          })
        : this.memberMailer.sendWorkspaceAdded({
            to: email,
            workspaceName: workspace.name,
            inviterName,
            role: dto.role
          })
    );

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

    return {
      member: this.toMemberDto(toWorkspaceMemberWithUser(membership)),
      userCreated,
      emailSent: emailDelivery.emailSent,
      ...(emailDelivery.emailSkipReason ? { emailSkipReason: emailDelivery.emailSkipReason } : {}),
      ...(emailDelivery.emailFailureMessage
        ? { emailFailureMessage: emailDelivery.emailFailureMessage }
        : {})
    };
  }

  async resendMemberCredentials(
    workspaceId: string,
    memberId: string
  ): Promise<MemberEmailDeliveryDto> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: true }
    });
    if (!member) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Workspace member not found",
        HttpStatus.NOT_FOUND
      );
    }
    if (!member.user.mustChangePassword) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "This member has already set their password",
        HttpStatus.FORBIDDEN
      );
    }

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }

    const temporaryPassword = generateTempPassword();
    await this.prisma.user.update({
      where: { id: member.userId },
      data: {
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true
      }
    });

    const inviteHandoff = await this.auth.prepareInviteHandoff(member.userId, temporaryPassword);

    const emailDelivery = await deliverMemberEmail(this.memberMailer.isConfigured, () =>
      this.memberMailer.sendNewMemberCredentials({
        to: member.user.email,
        workspaceName: workspace.name,
        temporaryPassword,
        inviteHandoffToken: inviteHandoff.inviteHandoffToken,
        role: member.role as "ADMIN" | "MEMBER"
      })
    );

    return emailDelivery;
  }

  async generateBulkInviteTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Members");

    sheet.columns = [
      { header: "Email", key: "email", width: 30 },
      { header: "Name", key: "name", width: 30 },
      { header: "Role", key: "role", width: 15 }
    ];

    sheet.addRow({ email: "john@example.com", name: "John Doe", role: "MEMBER" });
    sheet.addRow({ email: "admin@example.com", name: "Jane Admin", role: "ADMIN" });

    for (let i = 2; i <= 500; i++) {
      const cell = sheet.getCell(`C${i}`);
      cell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"ADMIN,MEMBER"']
      };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=members_template.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  }

  async parseBulkInviteExcel(buffer: Buffer): Promise<InviteMemberDto[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Excel file is empty",
        HttpStatus.BAD_REQUEST
      );
    }

    const members: InviteMemberDto[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const email = row.getCell(1).text?.trim();
      const name = row.getCell(2).text?.trim();
      const roleText = row.getCell(3).text?.trim().toUpperCase() || "MEMBER";

      if (!email) return; // Skip empty rows

      members.push({
        email,
        name: name || email.split("@")[0], // Fallback name
        role: roleText === "ADMIN" ? "ADMIN" : "MEMBER"
      });
    });

    if (members.length === 0) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No valid members found in the file",
        HttpStatus.BAD_REQUEST
      );
    }
    if (members.length > 500) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Maximum 500 members allowed per batch",
        HttpStatus.BAD_REQUEST
      );
    }

    return members;
  }

  async bulkInvite(workspaceId: string, members: InviteMemberDto[], invitedByUserId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }

    const emails = members.map((member) => member.email.trim().toLowerCase());
    await this.planLimit.assertSeatsForEmails((workspace as any).tenantId, emails);

    const job = await this.bulkInviteQueue.add(
      "bulkInviteJob",
      {
        workspaceId,
        members,
        invitedByUserId
      },
      { removeOnComplete: true, removeOnFail: false }
    );

    return {
      jobId: String(job.id!),
      status: "queued",
      enqueuedCount: members.length
    };
  }

  async getById(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id } });
    return this.toWorkspaceDto(ws);
  }

  async update(id: string, dto: { name?: string; settings?: any }) {
    const data: any = {};
    if (dto.name !== undefined) {
      const ws = await this.prisma.workspace.findUnique({ where: { id } });
      if (!ws) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Workspace not found",
          HttpStatus.NOT_FOUND
        );
      }
      await this.assertNameAvailable(dto.name, (ws as any).tenantId, id);
      data.name = dto.name;
    }
    if (dto.settings !== undefined) {
      const ws = await this.prisma.workspace.findUnique({ where: { id } });
      if (!ws) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Workspace not found",
          HttpStatus.NOT_FOUND
        );
      }
      const existingSettings =
        typeof ws.settings === "object" && ws.settings !== null ? ws.settings : {};
      data.settings = {
        ...existingSettings,
        ...dto.settings
      };
    }
    return this.toWorkspaceDto(
      await this.prisma.workspace.update({
        where: { id },
        data
      })
    );
  }

  async create(
    userId: string,
    dto: { name: string; slug?: string }
  ): Promise<WorkspaceWithRoleDto> {
    const slugify = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 64);

    let slug = dto.slug ?? slugify(dto.name);
    if (!slug) {
      slug = `workspace-${Date.now()}`;
    }
    const slugTaken = await this.prisma.workspace.findUnique({ where: { slug } });
    if (slugTaken) {
      slug = `${slug}-${Date.now()}`;
    }

    const { tenantId } = await requireTenantOperator(this.prisma, userId);

    await this.planLimit.assertWorkspaceCreateAllowed(tenantId);
    await this.assertNameAvailable(dto.name, tenantId);

    const created = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          tenantId,
          name: dto.name,
          slug,
          settings: {}
        } as any
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: "ADMIN"
        }
      });

      return this.toWorkspaceWithRole(workspace, "ADMIN");
    });

    void this.notifyWorkspaceCreated(tenantId, userId, created).catch(() => undefined);

    return created;
  }

  private async notifyWorkspaceCreated(
    tenantId: string,
    actingUserId: string,
    workspace: WorkspaceWithRoleDto
  ): Promise<void> {
    const [creator, tenant] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actingUserId },
        select: { name: true }
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true }
      })
    ]);

    await this.notificationsDispatch.notifyTenantOperators(tenantId, workspace.id, {
      templateId: "workspace.created",
      context: {
        workspaceName: workspace.name,
        creatorName: creator?.name,
        organizationName: tenant?.name
      },
      excludeUserId: actingUserId
    });
  }

  async assignAdminAsTenantOwner(
    actingUserId: string,
    tenantId: string,
    workspaceId: string,
    dto: AssignWorkspaceAdminDto
  ): Promise<InviteMemberResponseDto> {
    await requireTenantOwnerOrAdmin(this.prisma, actingUserId, tenantId);

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }
    if ((workspace as any).tenantId !== tenantId) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Workspace does not belong to your organization",
        HttpStatus.FORBIDDEN
      );
    }

    let email: string;
    let name: string;

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!user) {
        throw new DomainException(ErrorCodes.NOT_FOUND, "User not found", HttpStatus.NOT_FOUND);
      }
      await assertUserNotInOtherTenant(this.prisma, user.id, tenantId);
      email = user.email;
      name = user.name;
    } else {
      email = dto.email!.trim().toLowerCase();
      name = dto.name!.trim();
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (user) {
        await assertUserNotInOtherTenant(this.prisma, user.id, tenantId);
      }
    }

    return this.invite(workspaceId, { email, name, role: "ADMIN" }, actingUserId);
  }

  private async assertNameAvailable(name: string, tenantId: string, excludeWorkspaceId?: string) {
    const existing = await this.prisma.workspace.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: "insensitive" },
        ...(excludeWorkspaceId ? { id: { not: excludeWorkspaceId } } : {})
      } as any
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "A workspace with this name already exists.",
        HttpStatus.CONFLICT
      );
    }
  }

  private toListItem(
    workspace: { id: string; name: string },
    role: "ADMIN" | "MEMBER",
    managedProjectIds?: string[]
  ): WorkspaceListItemDto {
    return {
      id: workspace.id,
      name: workspace.name,
      role,
      ...(managedProjectIds && managedProjectIds.length > 0 ? { managedProjectIds } : {})
    };
  }

  private toWorkspaceDto(workspace: {
    id: string;
    name: string;
    slug: string;
    settings: unknown;
  }): WorkspaceDto {
    const settings =
      typeof workspace.settings === "object" && workspace.settings !== null
        ? (workspace.settings as Record<string, unknown>)
        : undefined;
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      ...(settings ? { settings } : {})
    };
  }

  private toWorkspaceWithRole(
    workspace: { id: string; name: string; slug: string; settings: unknown },
    role: "ADMIN" | "MEMBER"
  ): WorkspaceWithRoleDto {
    return { ...this.toWorkspaceDto(workspace), role };
  }

  private toMemberPickerDto(member: {
    id: string;
    userId: string;
    user: { name: string; email: string };
  }): WorkspaceMemberPickerDto {
    return {
      id: member.id,
      userId: member.userId,
      userName: member.user.name,
      userEmail: member.user.email
    };
  }

  private async getMembership(workspaceId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: true }
    });
    if (!member) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Workspace member not found",
        HttpStatus.NOT_FOUND
      );
    }
    return member;
  }

  private countAdmins(workspaceId: string) {
    return this.prisma.workspaceMember.count({
      where: { workspaceId, role: "ADMIN" }
    });
  }

  private async assertTenantWorkspace(
    tenantId: string,
    workspaceId: string
  ): Promise<{ id: string; name: string; tenantId: string }> {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }
    if ((workspace as any).tenantId !== tenantId) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Workspace does not belong to your organization",
        HttpStatus.FORBIDDEN
      );
    }
    return workspace as any;
  }

  async updateMemberAsTenantOperator(
    actingUserId: string,
    tenantId: string,
    workspaceId: string,
    memberId: string,
    dto: UpdateWorkspaceMemberDto
  ) {
    await requireTenantOwnerOrAdmin(this.prisma, actingUserId, tenantId);
    await this.assertTenantWorkspace(tenantId, workspaceId);
    return this.updateMember(workspaceId, memberId, dto, actingUserId);
  }

  async removeMemberAsTenantOperator(
    actingUserId: string,
    tenantId: string,
    workspaceId: string,
    memberId: string
  ) {
    await requireTenantOwnerOrAdmin(this.prisma, actingUserId, tenantId);
    await this.assertTenantWorkspace(tenantId, workspaceId);
    return this.removeMember(workspaceId, memberId, actingUserId);
  }

  async resendMemberCredentialsAsTenantOperator(
    actingUserId: string,
    tenantId: string,
    workspaceId: string,
    memberId: string
  ): Promise<MemberEmailDeliveryDto> {
    await requireTenantOwnerOrAdmin(this.prisma, actingUserId, tenantId);
    await this.assertTenantWorkspace(tenantId, workspaceId);
    return this.resendMemberCredentials(workspaceId, memberId);
  }

  async getWorkspacesTree(tenantId: string) {
    return this.prisma.workspace.findMany({
      where: { tenantId } as any,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                jobTitle: true,
                department: true,
                workStartDate: true
              }
            }
          }
        },
        projects: {
          include: {
            team: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                        jobTitle: true,
                        department: true,
                        workStartDate: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    });
  }

  private toMemberDto(member: WorkspaceMemberWithUser) {
    return {
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role as "ADMIN" | "MEMBER",
      isActive: member.isActive,
      userName: member.user.name,
      userEmail: member.user.email
    };
  }
}
