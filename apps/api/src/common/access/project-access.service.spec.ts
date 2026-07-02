import { ErrorCodes } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../errors/domain.exception";
import { ProjectAccessService } from "./project-access.service";

describe("ProjectAccessService", () => {
  let service: ProjectAccessService;
  let mockPrisma: {
    task: { findFirst: ReturnType<typeof vi.fn> };
    teamMember: { findFirst: ReturnType<typeof vi.fn> };
    project: { findFirst: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrisma = {
      task: { findFirst: vi.fn() },
      teamMember: { findFirst: vi.fn(), findMany: vi.fn() },
      project: { findFirst: vi.fn(), findMany: vi.fn() }
    };
    service = new ProjectAccessService(mockPrisma as never);
  });

  it("assertTaskLoggable rejects inactive project", async () => {
    mockPrisma.task.findFirst.mockResolvedValue({
      id: "task-1",
      isActive: true,
      category: { isActive: true },
      project: { isActive: false }
    });

    await expect(service.assertTaskLoggable("ws-1", "task-1")).rejects.toSatisfy(
      (err: unknown) => err instanceof DomainException && err.code === ErrorCodes.ENTITY_INACTIVE
    );
  });

  it("assertTaskLoggable allows fully active chain", async () => {
    mockPrisma.task.findFirst.mockResolvedValue({
      id: "task-1",
      isActive: true,
      category: { isActive: true },
      project: { isActive: true }
    });

    await expect(service.assertTaskLoggable("ws-1", "task-1")).resolves.toBeUndefined();
  });

  it("accessibleProjectIds includes inactive projects for members", async () => {
    mockPrisma.teamMember.findMany.mockResolvedValue([
      { team: { projectId: "proj-inactive" } },
      { team: { projectId: "proj-active" } }
    ]);

    const ids = await service.accessibleProjectIds("ws-1", "user-1", "MEMBER");
    expect(ids).toEqual(["proj-inactive", "proj-active"]);
  });
});
