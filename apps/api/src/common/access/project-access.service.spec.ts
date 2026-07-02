import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../errors/domain.exception";
import { ProjectAccessService } from "./project-access.service";

describe("ProjectAccessService", () => {
  let service: ProjectAccessService;
  let mockPrisma: {
    teamMember: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
    project: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrisma = {
      teamMember: {
        findMany: vi.fn(),
        findFirst: vi.fn()
      },
      project: {
        findMany: vi.fn(),
        findFirst: vi.fn()
      }
    };
    service = new ProjectAccessService(mockPrisma as never);
  });

  it("returns led project ids for MEMBER", async () => {
    mockPrisma.teamMember.findMany.mockResolvedValue([
      { team: { projectId: "proj-1" } },
      { team: { projectId: "proj-2" } }
    ]);
    const ids = await service.managedProjectIds("ws-1", "user-1");
    expect(ids).toEqual(["proj-1", "proj-2"]);
  });

  it("assertCanManageProject allows ADMIN", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: "proj-1" });
    await expect(
      service.assertCanManageProject("ws-1", "admin-1", "ADMIN", "proj-1")
    ).resolves.toBeUndefined();
  });

  it("assertCanManageProject rejects MEMBER without PROJECT_MANAGER", async () => {
    mockPrisma.teamMember.findFirst.mockResolvedValue(null);
    await expect(
      service.assertCanManageProject("ws-1", "user-1", "MEMBER", "proj-1")
    ).rejects.toBeInstanceOf(DomainException);
  });
});
