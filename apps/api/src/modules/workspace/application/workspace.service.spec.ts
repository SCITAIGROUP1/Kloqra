import { ErrorCodes } from "@chronomint/contracts";
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
        create: vi.fn()
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
        user: { name: "Admin User", email: "admin@chronomint.dev" }
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
        userEmail: "admin@chronomint.dev"
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
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", email: "member@chronomint.dev" });
    mockPrisma.workspaceMember.findUnique.mockResolvedValue({ id: "m-existing" });

    await expect(
      service.invite(workspaceId, { email: "member@chronomint.dev", role: "MEMBER" })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.VALIDATION_ERROR &&
        err.getStatus() === HttpStatus.CONFLICT
    );
  });

  it("invite creates membership for registered user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", email: "new@chronomint.dev" });
    mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);
    mockPrisma.workspaceMember.create.mockResolvedValue({
      workspaceId,
      userId: "u2",
      role: "MEMBER"
    });

    const result = await service.invite(workspaceId, {
      email: "new@chronomint.dev",
      role: "MEMBER"
    });

    expect(mockPrisma.workspaceMember.create).toHaveBeenCalledWith({
      data: { workspaceId, userId: "u2", role: "MEMBER" }
    });
    expect(result.role).toBe("MEMBER");
  });
});
