import { describe, expect, it, vi, beforeEach } from "vitest";
import { TimesheetMissingDigestService } from "./timesheet-missing-digest.service";

describe("TimesheetMissingDigestService", () => {
  let prisma: {
    workspace: { findMany: ReturnType<typeof vi.fn> };
    notification: { findFirst: ReturnType<typeof vi.fn> };
  };
  let redis: { getClient: ReturnType<typeof vi.fn> };
  let timesheets: { listMissing: ReturnType<typeof vi.fn> };
  let notificationsDispatch: { notifyWorkspaceAdmins: ReturnType<typeof vi.fn> };
  let service: TimesheetMissingDigestService;

  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://test";
    prisma = {
      workspace: { findMany: vi.fn() },
      notification: { findFirst: vi.fn() }
    };
    redis = {
      getClient: vi.fn().mockReturnValue({
        set: vi.fn().mockResolvedValue("OK")
      })
    };
    timesheets = { listMissing: vi.fn() };
    notificationsDispatch = { notifyWorkspaceAdmins: vi.fn().mockResolvedValue(undefined) };
    service = new TimesheetMissingDigestService(
      prisma as never,
      redis as never,
      timesheets as never,
      notificationsDispatch as never
    );
  });

  it("notifies admins when missing timesheets exist and digest was not sent", async () => {
    prisma.workspace.findMany.mockResolvedValue([{ id: "w1", name: "Acme Corp" }]);
    timesheets.listMissing.mockResolvedValue({
      items: [
        {
          periodStart: "2026-06-09T00:00:00.000Z",
          periodLabel: "Week 23"
        }
      ]
    });
    prisma.notification.findFirst.mockResolvedValue(null);

    await service.processWeeklyDigests(new Date("2026-06-16T07:00:00.000Z"));

    expect(notificationsDispatch.notifyWorkspaceAdmins).toHaveBeenCalledWith("w1", {
      templateId: "timesheet.missing.digest",
      context: {
        workspaceName: "Acme Corp",
        missingCount: 1,
        periodLabel: "Week 23",
        periodStart: "2026-06-09T00:00:00.000Z"
      }
    });
  });

  it("skips workspaces with no missing timesheets", async () => {
    prisma.workspace.findMany.mockResolvedValue([{ id: "w1", name: "Acme Corp" }]);
    timesheets.listMissing.mockResolvedValue({ items: [] });

    await service.processWeeklyDigests(new Date("2026-06-16T07:00:00.000Z"));

    expect(notificationsDispatch.notifyWorkspaceAdmins).not.toHaveBeenCalled();
    expect(prisma.notification.findFirst).not.toHaveBeenCalled();
  });

  it("skips when digest already sent for the period", async () => {
    prisma.workspace.findMany.mockResolvedValue([{ id: "w1", name: "Acme Corp" }]);
    timesheets.listMissing.mockResolvedValue({
      items: [
        {
          periodStart: "2026-06-09T00:00:00.000Z",
          periodLabel: "Week 23"
        }
      ]
    });
    prisma.notification.findFirst.mockResolvedValue({ id: "n1" });

    await service.processWeeklyDigests(new Date("2026-06-16T07:00:00.000Z"));

    expect(notificationsDispatch.notifyWorkspaceAdmins).not.toHaveBeenCalled();
  });
});
