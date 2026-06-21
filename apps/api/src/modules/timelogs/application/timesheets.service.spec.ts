import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { TimesheetsService } from "./timesheets.service";

describe("TimesheetsService", () => {
  let service: TimesheetsService;
  let mockPrisma: any;
  let mockNotificationsDispatch: { notifyWorkspaceAdmins: ReturnType<typeof vi.fn> };

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
    timesheetApprovalEnabledAt: new Date("2025-01-01T00:00:00.000Z"),
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    workspace: { name: "Acme", settings: { weekStart: "monday" } }
  };

  beforeEach(() => {
    mockNotificationsDispatch = {
      notifyWorkspaceAdmins: vi.fn().mockResolvedValue(undefined)
    };
    mockPrisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue(projectRow),
        findUniqueOrThrow: vi.fn().mockResolvedValue(projectRow),
        findMany: vi.fn().mockResolvedValue([projectRow])
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ name: "Sam" })
      },
      timeLog: {
        findMany: vi.fn().mockResolvedValue([{ task: { projectId } }]),
        findFirst: vi.fn().mockResolvedValue(null),
        aggregate: vi.fn().mockResolvedValue({ _sum: { durationSec: 3600 } })
      },
      teamMember: {
        findMany: vi.fn().mockResolvedValue([{ team: { projectId } }])
      },
      timesheetPeriod: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([])
      },
      timesheetAmendmentRequest: {
        findFirst: vi.fn().mockResolvedValue(null)
      },
      notification: {
        findFirst: vi.fn().mockResolvedValue(null)
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma))
    };
    service = new TimesheetsService(mockPrisma, {
      notify: vi.fn().mockResolvedValue(undefined),
      notifyWorkspaceAdmins: mockNotificationsDispatch.notifyWorkspaceAdmins
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

    const result = await service.submit(
      workspaceId,
      userId,
      projectId,
      "2025-06-05",
      "Week done",
      true
    );

    expect(result.period.status).toBe("SUBMITTED");
    expect(result.period.projectName).toBe("Website");
    expect(mockPrisma.timesheetPeriod.create).toHaveBeenCalled();
  });

  it("submit omits totalHours from admin notification when no time was logged", async () => {
    mockPrisma.timeLog.aggregate.mockResolvedValue({ _sum: { durationSec: 0 } });
    mockPrisma.timesheetPeriod.findUnique.mockResolvedValue(null);
    mockPrisma.timesheetPeriod.create.mockResolvedValue({
      id: "period-1",
      userId,
      workspaceId,
      projectId,
      periodStart,
      periodEnd,
      status: "SUBMITTED",
      note: null,
      reviewNote: null,
      reviewedBy: null,
      submittedAt: new Date("2025-06-09T10:00:00.000Z"),
      reviewedAt: null
    });

    await service.submit(workspaceId, userId, projectId, "2025-06-05", undefined, true);

    expect(mockNotificationsDispatch.notifyWorkspaceAdmins).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({
        context: expect.not.objectContaining({ totalHours: expect.anything() })
      })
    );
  });

  it("submit rejects when project approval is disabled", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({
      ...projectRow,
      timesheetApprovalEnabled: false
    });

    await expect(
      service.submit(workspaceId, userId, projectId, "2025-06-05", undefined, true)
    ).rejects.toSatisfy(
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

    await expect(
      service.submit(workspaceId, userId, projectId, "2025-06-05", undefined, true)
    ).rejects.toSatisfy(
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
      amendments: [],
      project: {
        name: "Website",
        timesheetApprovalPeriod: "weekly",
        workspace: { settings: { weekStart: "monday" } }
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
    expect(service["notificationsDispatch"].notify).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "timesheet.approved",
        context: expect.objectContaining({
          totalHours: 1
        })
      })
    );
    expect(result).toEqual({ ok: true });
  });

  it("listSubmissions with logged scope queries time logs", async () => {
    mockPrisma.timesheetPeriod.findMany.mockResolvedValue([]);
    mockPrisma.timeLog.findMany
      .mockResolvedValueOnce([{ task: { projectId } }])
      .mockResolvedValueOnce([
        { startTime: new Date("2025-06-03T10:00:00.000Z"), durationSec: 3600 }
      ]);

    const result = await service.listSubmissions(workspaceId, userId, "2025-06-05", "logged");

    expect(mockPrisma.timeLog.findMany).toHaveBeenCalled();
    expect(mockPrisma.teamMember.findMany).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("DRAFT");
  });

  it("listSubmissions omits draft periods with zero logged hours", async () => {
    mockPrisma.timesheetPeriod.findMany.mockResolvedValue([]);
    mockPrisma.timeLog.findMany
      .mockResolvedValueOnce([{ task: { projectId } }])
      .mockResolvedValueOnce([]);

    const result = await service.listSubmissions(workspaceId, userId, "2025-06-05", "logged");

    expect(result.items).toHaveLength(0);
  });

  it("listSubmissions with assigned scope queries team memberships", async () => {
    mockPrisma.timesheetPeriod.findMany.mockResolvedValue([]);
    mockPrisma.timeLog.findMany.mockResolvedValue([
      { startTime: new Date("2025-06-03T10:00:00.000Z"), durationSec: 3600 }
    ]);

    const result = await service.listSubmissions(workspaceId, userId, "2025-06-05", "assigned");

    expect(mockPrisma.teamMember.findMany).toHaveBeenCalled();
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
      amendments: [],
      project: {
        name: "Website",
        timesheetApprovalPeriod: "weekly",
        workspace: { settings: { weekStart: "monday" } }
      }
    });
    mockPrisma.timesheetPeriod.update.mockResolvedValue({
      id: "period-1",
      status: "REJECTED"
    });

    const result = await service.reject(workspaceId, "period-1", adminUserId, "Missing notes");

    expect(mockPrisma.timesheetPeriod.update).toHaveBeenCalledWith({
      where: { id: "period-1" },
      data: expect.objectContaining({
        status: "REJECTED",
        reviewedBy: adminUserId,
        reviewNote: "Missing notes"
      })
    });
    expect(service["notificationsDispatch"].notify).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "timesheet.rejected",
        context: expect.objectContaining({
          totalHours: 1
        })
      })
    );
    expect(result).toEqual({ ok: true });
  });

  it("reject requires a review note", async () => {
    await expect(service.reject(workspaceId, "period-1", adminUserId)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException && /review note is required/i.test(err.message)
    );
    expect(mockPrisma.timesheetPeriod.update).not.toHaveBeenCalled();
  });

  it("listPending returns items wrapper", async () => {
    mockPrisma.timesheetPeriod.findMany.mockResolvedValue([]);
    const result = await service.listPending(workspaceId);
    expect(result).toEqual({ items: [] });
    expect(mockPrisma.timesheetPeriod.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId, status: "SUBMITTED" })
      })
    );
  });

  it("listPending applies project and member filters", async () => {
    mockPrisma.timesheetPeriod.findMany.mockResolvedValue([]);
    await service.listPending(workspaceId, {
      projectId: "proj-1",
      userId: "user-1",
      from: "2026-03-01",
      to: "2026-03-31"
    });
    expect(mockPrisma.timesheetPeriod.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "proj-1",
          userId: "user-1",
          periodStart: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) })
        })
      })
    );
  });

  it("listApproved filters by APPROVED status", async () => {
    mockPrisma.timesheetPeriod.findMany.mockResolvedValue([]);
    await service.listApproved(workspaceId, { projectId: "proj-1" });
    expect(mockPrisma.timesheetPeriod.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "APPROVED", projectId: "proj-1" }),
        orderBy: { reviewedAt: "desc" }
      })
    );
  });

  it("listRejected filters by REJECTED status", async () => {
    mockPrisma.timesheetPeriod.findMany.mockResolvedValue([]);
    await service.listRejected(workspaceId, { userId: "user-1" });
    expect(mockPrisma.timesheetPeriod.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "REJECTED", userId: "user-1" }),
        orderBy: { reviewedAt: "desc" }
      })
    );
  });
});
