import { ErrorCodes } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { TimesheetAmendmentsService } from "./timesheet-amendments.service";

describe("TimesheetAmendmentsService", () => {
  let service: TimesheetAmendmentsService;
  let mockPrisma: any;

  const workspaceId = "ws-1";
  const userId = "user-1";
  const periodId = "period-1";

  beforeEach(() => {
    mockPrisma = {
      timesheetPeriod: {
        findFirst: vi.fn(),
        update: vi.fn()
      },
      timesheetAmendmentRequest: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn(),
        findUniqueOrThrow: vi.fn()
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma))
    };
    const mockAccess = {
      assertCanManageProject: vi.fn().mockResolvedValue(undefined),
      manageableProjectIds: vi.fn().mockResolvedValue(["proj-1"])
    };
    service = new TimesheetAmendmentsService(
      mockPrisma,
      {
        notify: vi.fn().mockResolvedValue(undefined),
        notifyWorkspaceAdmins: vi.fn().mockResolvedValue(undefined)
      } as never,
      mockAccess as never
    );
  });

  it("creates amendment for submitted period", async () => {
    mockPrisma.timesheetPeriod.findFirst.mockResolvedValue({
      id: periodId,
      userId,
      workspaceId,
      projectId: "proj-1",
      periodStart: new Date("2025-06-02T00:00:00.000Z"),
      periodEnd: new Date("2025-06-08T23:59:59.999Z"),
      status: "SUBMITTED",
      project: {
        name: "Website",
        timesheetApprovalPeriod: "weekly",
        workspace: { name: "Acme", settings: {} }
      }
    });
    mockPrisma.timesheetAmendmentRequest.findFirst.mockResolvedValue(null);
    mockPrisma.timesheetAmendmentRequest.create.mockResolvedValue({
      id: "amend-1",
      periodId,
      userId,
      workspaceId,
      reason: "Missing entry",
      status: "PENDING",
      adminNote: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      user: { name: "Sam", email: "sam@test.com" },
      period: {
        projectId: "proj-1",
        periodStart: new Date("2025-06-02T00:00:00.000Z"),
        periodEnd: new Date("2025-06-08T23:59:59.999Z"),
        project: {
          name: "Website",
          timesheetApprovalPeriod: "weekly",
          workspace: { name: "Acme", settings: {} }
        }
      }
    });

    const result = await service.create(workspaceId, userId, periodId, "Missing entry");
    expect(result.status).toBe("PENDING");
    expect(result.reason).toBe("Missing entry");
  });

  it("approve rolls back status on period update failure (transaction atomicity)", async () => {
    const periodStart = new Date("2025-06-02T00:00:00.000Z");
    const periodEnd = new Date("2025-06-08T23:59:59.999Z");
    mockPrisma.timesheetAmendmentRequest.findFirst.mockResolvedValue({
      id: "amend-1",
      periodId: "period-1",
      userId,
      workspaceId,
      status: "PENDING",
      period: {
        id: "period-1",
        status: "APPROVED",
        projectId: "proj-1",
        periodStart,
        periodEnd,
        project: {
          name: "Website",
          timesheetApprovalPeriod: "weekly",
          workspace: { name: "Acme", settings: {} }
        }
      }
    });

    mockPrisma.timesheetAmendmentRequest.updateMany.mockResolvedValue({ count: 1 });
    // Make update throw an error to simulate database failure inside the transaction
    mockPrisma.timesheetPeriod.update.mockRejectedValue(new Error("Database write failed"));

    await expect(service.approve(workspaceId, "amend-1", "admin-1", "ADMIN")).rejects.toThrow(
      "Database write failed"
    );

    expect(mockPrisma.timesheetAmendmentRequest.updateMany).toHaveBeenCalled();
    expect(mockPrisma.timesheetPeriod.update).toHaveBeenCalled();
  });

  it("listPending enforces cross-workspace data isolation", async () => {
    mockPrisma.timesheetAmendmentRequest.findMany.mockResolvedValue([]);

    await service.listPending("workspace-target", "user-target", "ADMIN", {
      userId: "user-target"
    });

    expect(mockPrisma.timesheetAmendmentRequest.findMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "workspace-target",
        status: "PENDING",
        userId: "user-target"
      },
      include: expect.any(Object),
      orderBy: { createdAt: "desc" }
    });
  });

  it("deny requires an admin note", async () => {
    await expect(service.deny(workspaceId, "amend-1", "admin-1", "ADMIN")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.VALIDATION_ERROR &&
        /Admin note is required/i.test(err.message)
    );
  });
});
