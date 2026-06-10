import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { WorkspaceService } from "./workspace.service";

describe("WorkspaceService", () => {
  let service: WorkspaceService;
  let mockPrisma: any;

  const workspaceId = "ws-1";

  beforeEach(() => {
    mockPrisma = {
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
        findUnique: vi.fn()
      }
    };
    service = new WorkspaceService(mockPrisma);
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

  it("invite rejects unknown users", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.invite(workspaceId, { email: "missing@example.com", role: "MEMBER" })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.NOT_FOUND &&
        err.getStatus() === HttpStatus.NOT_FOUND
    );
  });

  it("invite rejects duplicate members", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", email: "member@kloqra.dev" });
    mockPrisma.workspaceMember.findUnique.mockResolvedValue({ id: "m-existing" });

    await expect(
      service.invite(workspaceId, { email: "member@kloqra.dev", role: "MEMBER" })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.VALIDATION_ERROR &&
        err.getStatus() === HttpStatus.CONFLICT
    );
  });

  it("invite creates membership for registered user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", email: "new@kloqra.dev" });
    mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);
    mockPrisma.workspaceMember.create.mockResolvedValue({
      workspaceId,
      userId: "u2",
      role: "MEMBER"
    });

    const result = await service.invite(workspaceId, {
      email: "new@kloqra.dev",
      role: "MEMBER"
    });

    expect(mockPrisma.workspaceMember.create).toHaveBeenCalledWith({
      data: { workspaceId, userId: "u2", role: "MEMBER" }
    });
    expect(result.role).toBe("MEMBER");
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
