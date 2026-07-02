import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import type { MemberProvisioningMailer } from "../../../common/mailer/member-provisioning.mailer";
import { WorkspaceService } from "./workspace.service";

vi.mock("../../../common/auth/password.util", () => ({
  generateTempPassword: vi.fn().mockReturnValue("TempPass123!"),
  hashPassword: vi.fn().mockResolvedValue("hashed-temp"),
  deriveNameFromEmail: vi.fn().mockReturnValue("New User")
}));

describe("WorkspaceService", () => {
  let service: WorkspaceService;
  let mockPrisma: any;
  let mockMailer: MemberProvisioningMailer;
  let mockNotificationsDispatch: {
    notify: ReturnType<typeof vi.fn>;
    notifyWorkspaceAdmins: ReturnType<typeof vi.fn>;
  };
  let mockQueue: any;
  let mockPlanLimit: any;

  const workspaceId = "ws-1";
  const inviterId = "admin-1";

  beforeEach(() => {
    mockNotificationsDispatch = {
      notify: vi.fn().mockResolvedValue(undefined),
      notifyWorkspaceAdmins: vi.fn().mockResolvedValue(undefined)
    };
    mockPrisma = {
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
      $queryRaw: vi.fn().mockResolvedValue([1]),
      workspace: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn()
      },
      workspaceMember: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn()
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      teamMember: {
        updateMany: vi.fn()
      },
      tenantMember: {
        findUnique: vi.fn().mockResolvedValue({
          tenantId: "t-1",
          role: "OWNER",
          isActive: true
        })
      }
    };
    mockMailer = {
      sendNewMemberCredentials: vi.fn().mockResolvedValue({ sent: true }),
      sendWorkspaceAdded: vi.fn().mockResolvedValue({ sent: true }),
      isConfigured: true
    } as unknown as MemberProvisioningMailer;
    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: "job-1" })
    };
    mockPlanLimit = {
      assertWorkspaceCreateAllowed: vi.fn().mockResolvedValue(undefined),
      assertSeatsForEmails: vi.fn().mockResolvedValue(undefined)
    };
    const mockProjectAccess = {
      managedProjectIds: vi.fn().mockResolvedValue([])
    };
    service = new WorkspaceService(
      mockPrisma,
      mockMailer,
      mockNotificationsDispatch as never,
      { sendEmailVerification: vi.fn().mockResolvedValue(undefined) } as never,
      mockPlanLimit,
      mockProjectAccess as never,
      mockQueue as any
    );
  });

  it("listMembers maps membership rows to DTOs", async () => {
    mockPrisma.workspaceMember.findMany.mockResolvedValue([
      {
        id: "m1",
        workspaceId,
        userId: "u1",
        role: "ADMIN",
        user: { name: "Admin User", email: "admin@kloqra.dev" }
      }
    ]);

    const members = await service.listMembers(workspaceId);

    expect(members).toEqual([
      {
        id: "m1",
        userId: "u1",
        userName: "Admin User",
        userEmail: "admin@kloqra.dev"
      }
    ]);
  });

  it("invite creates user and membership for new email", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: workspaceId, name: "Kloqra" });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "u-new",
      email: "new@kloqra.dev",
      name: "New User"
    });
    mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);
    mockPrisma.workspaceMember.create.mockResolvedValue({
      id: "m-new",
      workspaceId,
      userId: "u-new",
      role: "MEMBER",
      user: { name: "New User", email: "new@kloqra.dev" }
    });

    const result = await service.invite(
      workspaceId,
      { email: "new@kloqra.dev", role: "MEMBER", name: "New User" },
      inviterId
    );

    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(mockMailer.sendNewMemberCredentials).toHaveBeenCalled();
    expect(result.userCreated).toBe(true);
    expect(result.emailSent).toBe(true);
    expect(result.member.userEmail).toBe("new@kloqra.dev");
  });

  it("invite rejects duplicate members", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: workspaceId, name: "Kloqra" });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", email: "member@kloqra.dev" });
    mockPrisma.workspaceMember.findUnique.mockResolvedValue({ id: "m-existing" });

    await expect(
      service.invite(
        workspaceId,
        { email: "member@kloqra.dev", role: "MEMBER", name: "Member User" },
        inviterId
      )
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.MEMBER_ALREADY_EXISTS &&
        err.getStatus() === HttpStatus.CONFLICT
    );
  });

  it("invite adds existing user and sends workspace-added email", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: workspaceId, name: "Kloqra" });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", email: "member@kloqra.dev" });
    mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);
    mockPrisma.workspaceMember.create.mockResolvedValue({
      id: "m2",
      workspaceId,
      userId: "u2",
      role: "MEMBER",
      user: { name: "Member User", email: "member@kloqra.dev" }
    });

    const result = await service.invite(
      workspaceId,
      { email: "member@kloqra.dev", role: "MEMBER", name: "Member User" },
      inviterId
    );

    expect(mockMailer.sendWorkspaceAdded).toHaveBeenCalled();
    expect(result.userCreated).toBe(false);
    expect(result.member.role).toBe("MEMBER");
  });

  it("resendMemberCredentials rotates password and sends email", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m-new",
      workspaceId,
      userId: "u-new",
      role: "MEMBER",
      user: { id: "u-new", email: "new@kloqra.dev", mustChangePassword: true }
    });
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: workspaceId, name: "Kloqra" });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.resendMemberCredentials(workspaceId, "m-new");

    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockMailer.sendNewMemberCredentials).toHaveBeenCalled();
    expect(result.emailSent).toBe(true);
  });

  it("resendMemberCredentials returns SMTP failure detail", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m-new",
      workspaceId,
      userId: "u-new",
      role: "MEMBER",
      user: { id: "u-new", email: "new@kloqra.dev", mustChangePassword: true }
    });
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: workspaceId, name: "Kloqra" });
    mockPrisma.user.update.mockResolvedValue({});
    mockMailer.sendNewMemberCredentials = vi.fn().mockResolvedValue({
      sent: false,
      reason: "failed",
      detail: "Sender not verified"
    });

    const result = await service.resendMemberCredentials(workspaceId, "m-new");

    expect(result.emailSent).toBe(false);
    expect(result.emailFailureMessage).toBe("Sender not verified");
  });

  it("updateMember changes role", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m2",
      workspaceId,
      userId: "u2",
      role: "MEMBER",
      isActive: true,
      user: { name: "Member User", email: "member@kloqra.dev" }
    });
    mockPrisma.workspaceMember.count.mockResolvedValue(2);
    mockPrisma.workspaceMember.update.mockResolvedValue({
      id: "m2",
      workspaceId,
      userId: "u2",
      role: "ADMIN",
      isActive: true,
      user: { name: "Member User", email: "member@kloqra.dev" }
    });
    mockPrisma.workspace.findUnique.mockResolvedValue({ name: "Kloqra" });
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Admin User" });

    const result = await service.updateMember(workspaceId, "m2", { role: "ADMIN" }, "u1");

    expect(result.role).toBe("ADMIN");
    expect(mockNotificationsDispatch.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u2",
        workspaceId,
        templateId: "member.roleChanged"
      })
    );
    expect(mockNotificationsDispatch.notifyWorkspaceAdmins).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ templateId: "member.roleUpdated" })
    );
  });

  it("updateMember blocks demoting the last admin", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m1",
      workspaceId,
      userId: "u1",
      role: "ADMIN",
      isActive: true,
      user: { name: "Admin User", email: "admin@kloqra.dev" }
    });
    mockPrisma.workspaceMember.count.mockResolvedValue(1);

    await expect(
      service.updateMember(workspaceId, "m1", { role: "MEMBER" }, "u1")
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.FORBIDDEN &&
        err.getStatus() === HttpStatus.FORBIDDEN
    );
  });

  it("removeMember deletes membership", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m2",
      workspaceId,
      userId: "u2",
      role: "MEMBER",
      isActive: true,
      user: { name: "Member User", email: "member@kloqra.dev" }
    });
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: workspaceId, name: "Kloqra" });
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Admin User" });
    mockPrisma.workspaceMember.delete.mockResolvedValue({ id: "m2" });

    const result = await service.removeMember(workspaceId, "m2", "u1");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: "m2" } });
    expect(mockNotificationsDispatch.notifyWorkspaceAdmins).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ templateId: "member.removed" })
    );
    expect(mockNotificationsDispatch.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u2",
        templateId: "workspace.removed"
      })
    );
  });

  it("updateMember deactivates membership and project teams", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m2",
      workspaceId,
      userId: "u2",
      role: "MEMBER",
      isActive: true,
      user: { name: "Member User", email: "member@kloqra.dev" }
    });
    mockPrisma.workspaceMember.count.mockResolvedValue(2);
    mockPrisma.workspaceMember.update.mockResolvedValue({
      id: "m2",
      workspaceId,
      userId: "u2",
      role: "MEMBER",
      isActive: false,
      user: { name: "Member User", email: "member@kloqra.dev" }
    });
    mockPrisma.teamMember = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) };

    const result = await service.updateMember(workspaceId, "m2", { isActive: false }, "u1");

    expect(result.isActive).toBe(false);
    expect(mockPrisma.teamMember.updateMany).toHaveBeenCalled();
  });

  it("removeMember blocks removing yourself", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m1",
      workspaceId,
      userId: "u1",
      role: "ADMIN",
      isActive: true,
      user: { name: "Admin User", email: "admin@kloqra.dev" }
    });

    await expect(service.removeMember(workspaceId, "m1", "u1")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.FORBIDDEN &&
        err.getStatus() === HttpStatus.FORBIDDEN
    );
  });

  it("create rejects duplicate workspace names within tenant", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(null);
    mockPrisma.workspace.findFirst.mockResolvedValue({
      id: "ws-existing",
      name: "Acme Corporation",
      tenantId: "t-1"
    });

    await expect(service.create("u1", { name: "Acme Corporation" })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.VALIDATION_ERROR &&
        err.message === "A workspace with this name already exists." &&
        err.getStatus() === HttpStatus.CONFLICT
    );
    expect(mockPrisma.workspace.create).not.toHaveBeenCalled();
  });

  it("create succeeds when name is available", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(null);
    mockPrisma.workspace.findFirst.mockResolvedValue(null);
    mockPrisma.workspace.create.mockResolvedValue({
      id: "ws-new",
      name: "Design Agency",
      slug: "design-agency",
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockPrisma.workspaceMember.create.mockResolvedValue({
      id: "m-new",
      workspaceId: "ws-new",
      userId: "u1",
      role: "ADMIN"
    });

    const result = await service.create("u1", { name: "Design Agency" });

    expect(result.name).toBe("Design Agency");
    expect(result.role).toBe("ADMIN");
    expect(mockPrisma.workspace.create).toHaveBeenCalled();
    expect(mockPlanLimit.assertWorkspaceCreateAllowed).toHaveBeenCalledWith("t-1");
  });

  it("create propagates workspace plan limit errors", async () => {
    const limitError = new DomainException(
      ErrorCodes.PLAN_LIMIT_EXCEEDED,
      "Organization workspace limit reached (3/3).",
      HttpStatus.PAYMENT_REQUIRED
    );
    mockPlanLimit.assertWorkspaceCreateAllowed.mockRejectedValue(limitError);

    await expect(service.create("u1", { name: "Design Agency" })).rejects.toBe(limitError);
    expect(mockPrisma.workspace.create).not.toHaveBeenCalled();
  });

  it("getById returns workspace with settings", async () => {
    mockPrisma.workspace.findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "ws-1",
      name: "Acme Corporation",
      slug: "acme",
      settings: {
        jiraSiteUrl: "https://acme.atlassian.net",
        jiraServiceEmail: "bot@acme.com",
        jiraServiceToken: "ATATT3xtoken"
      }
    });

    const result = await service.getById("ws-1");

    expect(result.id).toBe("ws-1");
    expect(result.name).toBe("Acme Corporation");
    expect((result as any).settings.jiraSiteUrl).toBe("https://acme.atlassian.net");
  });

  it("update rejects renaming to an existing workspace name", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({
      id: "ws-1",
      tenantId: "tenant-1",
      name: "Acme Corporation"
    });
    mockPrisma.workspace.findFirst.mockResolvedValue({
      id: "ws-other",
      name: "Meridian Product Co"
    });

    await expect(service.update("ws-1", { name: "Meridian Product Co" })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.VALIDATION_ERROR &&
        err.message === "A workspace with this name already exists." &&
        err.getStatus() === HttpStatus.CONFLICT
    );
  });

  describe("bulkInvite", () => {
    it("adds invite job to queue when workspace exists", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        name: "Kloqra",
        tenantId: "t-1"
      });
      const members = [{ email: "test@example.com", name: "Test User", role: "MEMBER" as const }];

      const result = await service.bulkInvite(workspaceId, members, inviterId);

      expect(result).toEqual({
        jobId: "job-1",
        status: "queued",
        enqueuedCount: 1
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        "bulkInviteJob",
        {
          workspaceId,
          members,
          invitedByUserId: inviterId
        },
        { removeOnComplete: true, removeOnFail: false }
      );
      expect(mockPlanLimit.assertSeatsForEmails).toHaveBeenCalledWith("t-1", ["test@example.com"]);
    });

    it("throws if workspace not found", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);
      await expect(service.bulkInvite(workspaceId, [], inviterId)).rejects.toThrow(DomainException);
    });
  });
});
