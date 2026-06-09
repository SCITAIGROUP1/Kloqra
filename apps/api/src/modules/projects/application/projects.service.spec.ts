import { ErrorCodes } from "@chronomint/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { ProjectsService } from "./projects.service";

describe("ProjectsService", () => {
  let service: ProjectsService;
  let mockPrisma: any;
  let mockAccess: any;

  const workspaceId = "ws-1";
  const userId = "user-1";

  beforeEach(() => {
    mockPrisma = {
      project: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn()
      }
    };
    mockAccess = {
      accessibleProjectIds: vi.fn(),
      assertCanAccessProject: vi.fn()
    };
    service = new ProjectsService(mockPrisma, mockAccess);
  });

  it("list returns empty array when user has no accessible projects", async () => {
    mockAccess.accessibleProjectIds.mockResolvedValue([]);

    const result = await service.list(workspaceId, userId, "MEMBER");
    expect(result).toEqual([]);
    expect(mockPrisma.project.findMany).not.toHaveBeenCalled();
  });

  it("list scopes projects to accessible ids in workspace", async () => {
    mockAccess.accessibleProjectIds.mockResolvedValue(["p1", "p2"]);
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: "p1",
        workspaceId,
        name: "Alpha",
        color: "#6366f1",
        clientName: null,
        budgetHours: null,
        isActive: true,
        timesheetApprovalEnabled: false,
        timesheetApprovalPeriod: null,
        workspace: { name: "ChronoMint" }
      }
    ]);

    const result = await service.list(workspaceId, userId, "MEMBER");

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["p1", "p2"] },
          workspaceId
        })
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alpha");
  });

  it("create persists a project with default color", async () => {
    mockPrisma.project.create.mockResolvedValue({
      id: "p-new",
      workspaceId,
      name: "New Project",
      color: "#6366f1",
      clientName: "Client",
      budgetHours: null,
      isActive: true,
      timesheetApprovalEnabled: false,
      timesheetApprovalPeriod: null,
      workspace: { name: "ChronoMint" }
    });

    const result = await service.create(workspaceId, {
      name: "New Project",
      clientName: "Client",
      isActive: true
    });

    expect(mockPrisma.project.create).toHaveBeenCalled();
    expect(result.name).toBe("New Project");
    expect(result.workspaceId).toBe(workspaceId);
  });

  it("get throws NOT_FOUND when project is missing", async () => {
    mockAccess.assertCanAccessProject.mockResolvedValue(undefined);
    mockPrisma.project.findFirst.mockResolvedValue(null);

    await expect(service.get(workspaceId, userId, "ADMIN", "missing")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.NOT_FOUND &&
        err.getStatus() === HttpStatus.NOT_FOUND
    );
  });
});
