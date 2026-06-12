import { describe, expect, it, vi, beforeEach } from "vitest";
import { TimesheetReminderService } from "./timesheet-reminder.service";

describe("TimesheetReminderService", () => {
  let service: TimesheetReminderService;
  let mockPrisma: any;
  let mockDispatch: { notify: ReturnType<typeof vi.fn> };

  const workspaceId = "ws-1";
  const userId = "user-1";
  const projectId = "proj-1";

  beforeEach(() => {
    mockDispatch = { notify: vi.fn().mockResolvedValue(undefined) };
    mockPrisma = {
      project: { findMany: vi.fn() },
      teamMember: { findMany: vi.fn() },
      timeLog: { findMany: vi.fn() },
      timesheetPeriod: { findUnique: vi.fn() },
      notification: { findFirst: vi.fn() }
    };
    service = new TimesheetReminderService(mockPrisma, mockDispatch as never);
  });

  it("sends a reminder when the period ends and the user has not submitted", async () => {
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: projectId,
        workspaceId,
        timesheetApprovalPeriod: "weekly",
        workspace: { settings: { weekStart: "monday", timezone: "UTC" } }
      }
    ]);
    mockPrisma.teamMember.findMany.mockResolvedValue([{ userId }]);
    mockPrisma.timeLog.findMany.mockResolvedValue([]);
    mockPrisma.timesheetPeriod.findUnique.mockResolvedValue(null);
    mockPrisma.notification.findFirst.mockResolvedValue(null);

    await service.processDueReminders(new Date("2026-06-21T17:00:00.000Z"));

    expect(mockDispatch.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        workspaceId,
        templateId: "timesheet.reminder",
        context: expect.objectContaining({
          periodLabel: expect.stringMatching(/^Week \d+$/),
          dueLabel: expect.stringContaining("Jun"),
          periodStart: expect.any(String)
        })
      })
    );
  });

  it("skips users who already submitted for the period", async () => {
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: projectId,
        workspaceId,
        timesheetApprovalPeriod: "weekly",
        workspace: { settings: { weekStart: "monday", timezone: "UTC" } }
      }
    ]);
    mockPrisma.teamMember.findMany.mockResolvedValue([{ userId }]);
    mockPrisma.timeLog.findMany.mockResolvedValue([]);
    mockPrisma.timesheetPeriod.findUnique.mockResolvedValue({ status: "SUBMITTED" });

    await service.processDueReminders(new Date("2026-06-21T17:00:00.000Z"));

    expect(mockDispatch.notify).not.toHaveBeenCalled();
  });

  it("does not send outside the reminder window", async () => {
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: projectId,
        workspaceId,
        timesheetApprovalPeriod: "weekly",
        workspace: { settings: { weekStart: "monday", timezone: "UTC" } }
      }
    ]);

    await service.processDueReminders(new Date("2026-06-21T10:00:00.000Z"));

    expect(mockPrisma.teamMember.findMany).not.toHaveBeenCalled();
    expect(mockDispatch.notify).not.toHaveBeenCalled();
  });

  it("deduplicates reminders already sent for the same period", async () => {
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: projectId,
        workspaceId,
        timesheetApprovalPeriod: "weekly",
        workspace: { settings: { weekStart: "monday", timezone: "UTC" } }
      }
    ]);
    mockPrisma.teamMember.findMany.mockResolvedValue([{ userId }]);
    mockPrisma.timeLog.findMany.mockResolvedValue([]);
    mockPrisma.timesheetPeriod.findUnique.mockResolvedValue(null);
    mockPrisma.notification.findFirst.mockResolvedValue({ id: "existing" });

    await service.processDueReminders(new Date("2026-06-21T17:00:00.000Z"));

    expect(mockDispatch.notify).not.toHaveBeenCalled();
  });
});
