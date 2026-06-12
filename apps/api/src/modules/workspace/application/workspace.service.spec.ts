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

  const workspaceId = "ws-1";
  const inviterId = "admin-1";

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findUnique: vi.fn()
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
        create: vi.fn()
      }
    };
    mockMailer = {
      sendNewMemberCredentials: vi.fn().mockResolvedValue({ sent: true }),
      sendWorkspaceAdded: vi.fn().mockResolvedValue({ sent: true })
    } as unknown as MemberProvisioningMailer;
    service = new WorkspaceService(
      mockPrisma,
      mockMailer,
      {
        notify: vi.fn().mockResolvedValue(undefined),
        notifyWorkspaceAdmins: vi.fn().mockResolvedValue(undefined)
      } as never,
      { sendEmailVerification: vi.fn().mockResolvedValue(undefined) } as never
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
        workspaceId,
        userId: "u1",
        role: "ADMIN",
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
      { email: "new@kloqra.dev", role: "MEMBER" },
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
      service.invite(workspaceId, { email: "member@kloqra.dev", role: "MEMBER" }, inviterId)
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
      { email: "member@kloqra.dev", role: "MEMBER" },
      inviterId
    );

    expect(mockMailer.sendWorkspaceAdded).toHaveBeenCalled();
    expect(result.userCreated).toBe(false);
    expect(result.member.role).toBe("MEMBER");
  });

  it("updateMember changes role", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m2",
      workspaceId,
      userId: "u2",
      role: "MEMBER",
      user: { name: "Member User", email: "member@kloqra.dev" }
    });
    mockPrisma.workspaceMember.count.mockResolvedValue(2);
    mockPrisma.workspaceMember.update.mockResolvedValue({
      id: "m2",
      workspaceId,
      userId: "u2",
      role: "ADMIN",
      user: { name: "Member User", email: "member@kloqra.dev" }
    });

    const result = await service.updateMember(workspaceId, "m2", { role: "ADMIN" }, "u1");

    expect(result.role).toBe("ADMIN");
  });

  it("updateMember blocks demoting the last admin", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m1",
      workspaceId,
      userId: "u1",
      role: "ADMIN",
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
      user: { name: "Member User", email: "member@kloqra.dev" }
    });
    mockPrisma.workspaceMember.delete.mockResolvedValue({ id: "m2" });

    const result = await service.removeMember(workspaceId, "m2", "u1");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: "m2" } });
  });

  it("removeMember blocks removing yourself", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "m1",
      workspaceId,
      userId: "u1",
      role: "ADMIN",
      user: { name: "Admin User", email: "admin@kloqra.dev" }
    });

    await expect(service.removeMember(workspaceId, "m1", "u1")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.FORBIDDEN &&
        err.getStatus() === HttpStatus.FORBIDDEN
    );
  });
});
