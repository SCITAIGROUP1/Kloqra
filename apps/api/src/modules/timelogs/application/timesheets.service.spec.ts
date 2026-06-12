import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { TimesheetsService } from "./timesheets.service";

describe("TimesheetsService", () => {
  let service: TimesheetsService;
  let mockPrisma: any;

  const workspaceId = "ws-1";
  const userId = "user-1";
  const projectId = "proj-1";
  const adminUserId = "admin-1";
  const periodStart = new Date("2025-06-02T00:00:00.000Z");
  const periodEnd = new Date("2025-06-08T23:59:59.999Z");

  const projectRow = {
    id: projectId,
    name: "Website",
    workspaceId,
    timesheetApprovalEnabled: true,
    timesheetApprovalPeriod: "weekly" as const,
    workspace: { settings: { weekStartsOn: "monday" } }
  };

  beforeEach(() => {
    mockPrisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue(projectRow)
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ name: "Sam" })
      },
      timeLog: {
        findMany: vi.fn().mockResolvedValue([{ task: { projectId } }])
      },
      teamMember: {
        findMany: vi.fn().mockResolvedValue([{ team: { projectId } }])
      },
      timesheetPeriod: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn()
      }
    };
    service = new TimesheetsService(mockPrisma, {
      notify: vi.fn().mockResolvedValue(undefined),
      notifyWorkspaceAdmins: vi.fn().mockResolvedValue(undefined)
    } as never);
  });

  it("submit creates a SUBMITTED period", async () => {
    mockPrisma.timesheetPeriod.findUnique.mockResolvedValue(null);
    mockPrisma.timesheetPeriod.create.mockResolvedValue({
      id: "period-1",
      userId,
      workspaceId,
      projectId,
      periodStart,
      periodEnd,
      status: "SUBMITTED",
      note: "Week done",
      reviewNote: null,
      reviewedBy: null,
      submittedAt: new Date("2025-06-09T10:00:00.000Z"),
      reviewedAt: null
    });

    const result = await service.submit(workspaceId, userId, projectId, "2025-06-05", "Week done");

    expect(result.status).toBe("SUBMITTED");
    expect(result.projectName).toBe("Website");
    expect(mockPrisma.timesheetPeriod.create).toHaveBeenCalled();
  });

  it("submit rejects when project approval is disabled", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({
      ...projectRow,
      timesheetApprovalEnabled: false
    });

    await expect(service.submit(workspaceId, userId, projectId, "2025-06-05")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.VALIDATION_ERROR &&
        err.getStatus() === HttpStatus.BAD_REQUEST
    );
  });

  it("submit rejects when period is already APPROVED", async () => {
    mockPrisma.timesheetPeriod.findUnique.mockResolvedValue({
      id: "period-1",
      status: "APPROVED"
    });

    await expect(service.submit(workspaceId, userId, projectId, "2025-06-05")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.FORBIDDEN &&
        err.getStatus() === HttpStatus.FORBIDDEN
    );
  });

  it("approve transitions period to APPROVED", async () => {
    mockPrisma.timesheetPeriod.findFirst.mockResolvedValue({
      id: "period-1",
      workspaceId,
      userId,
      projectId,
      periodStart,
      status: "SUBMITTED",
      project: {
        name: "Website",
        timesheetApprovalPeriod: "weekly",
        workspace: { settings: { weekStartsOn: "monday" } }
      }
    });
    mockPrisma.timesheetPeriod.update.mockResolvedValue({
      id: "period-1",
      status: "APPROVED"
    });

    const result = await service.approve(workspaceId, "period-1", adminUserId, "Looks good");

    expect(mockPrisma.timesheetPeriod.update).toHaveBeenCalledWith({
      where: { id: "period-1" },
      data: expect.objectContaining({
        status: "APPROVED",
        reviewedBy: adminUserId,
        reviewNote: "Looks good"
      })
    });
    expect(result.status).toBe("APPROVED");
  });

  it("listSubmissions with logged scope queries time logs", async () => {
    mockPrisma.timesheetPeriod.findUnique.mockResolvedValue(null);

    const result = await service.listSubmissions(workspaceId, userId, "2025-06-05", "logged");

    expect(mockPrisma.timeLog.findMany).toHaveBeenCalled();
    expect(mockPrisma.teamMember.findMany).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("DRAFT");
  });

  it("listSubmissions with assigned scope queries team memberships", async () => {
    mockPrisma.timesheetPeriod.findUnique.mockResolvedValue(null);

    const result = await service.listSubmissions(workspaceId, userId, "2025-06-05", "assigned");

    expect(mockPrisma.teamMember.findMany).toHaveBeenCalled();
    expect(mockPrisma.timeLog.findMany).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.projectName).toBe("Website");
  });

  it("reject transitions period to REJECTED", async () => {
    mockPrisma.timesheetPeriod.findFirst.mockResolvedValue({
      id: "period-1",
      workspaceId,
      userId,
      projectId,
      periodStart,
      status: "SUBMITTED",
      project: {
        name: "Website",
        timesheetApprovalPeriod: "weekly",
        workspace: { settings: { weekStartsOn: "monday" } }
      }
    });
    mockPrisma.timesheetPeriod.update.mockResolvedValue({
      id: "period-1",
      status: "REJECTED"
    });

    const result = await service.reject(workspaceId, "period-1", adminUserId, "Missing notes");

    expect(result.status).toBe("REJECTED");
  });
});
