import { ErrorCodes } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { NotificationsService } from "./notifications.service.js";

describe("NotificationsService", () => {
  const prisma = {
    notification: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn()
    }
  };

  let service: NotificationsService;
  let publish: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    publish = vi.fn().mockResolvedValue(undefined);
    service = new NotificationsService(
      prisma as never,
      {
        publishNotificationCreated: publish
      } as never
    );
  });

  it("lists notifications with pagination", async () => {
    const createdAt = new Date("2026-06-13T12:00:00.000Z");
    prisma.notification.count.mockResolvedValue(1);
    prisma.notification.findMany.mockResolvedValue([
      {
        id: "n1",
        workspaceId: "ws1",
        type: "APPROVAL_REQUEST",
        title: "Timesheet submitted",
        body: "Review needed",
        metadata: { href: "/approvals" },
        readAt: null,
        createdAt
      }
    ]);

    const result = await service.list("u1", "ws1", { page: 1, limit: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.readAt).toBeNull();
    expect(result.total).toBe(1);
    expect(result.items[0]).not.toHaveProperty("workspaceId");
  });

  it("lists unread-only when unreadOnly is true", async () => {
    prisma.notification.count.mockResolvedValue(0);
    prisma.notification.findMany.mockResolvedValue([]);

    await service.list("u1", "ws1", { page: 1, limit: 20, unreadOnly: true });

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: "u1", workspaceId: "ws1", readAt: null }
    });
  });

  it("returns unread count", async () => {
    prisma.notification.count.mockResolvedValue(3);
    await expect(service.unreadCount("u1", "ws1")).resolves.toEqual({ count: 3 });
  });

  it("marks notification read and unread", async () => {
    const createdAt = new Date("2026-06-13T12:00:00.000Z");
    prisma.notification.findFirst.mockResolvedValue({
      id: "n1",
      workspaceId: "ws1",
      type: "TIMESHEET_STATUS",
      title: "Approved",
      body: "Done",
      metadata: {},
      readAt: null,
      createdAt
    });
    prisma.notification.update.mockResolvedValue({
      id: "n1",
      workspaceId: "ws1",
      type: "TIMESHEET_STATUS",
      title: "Approved",
      body: "Done",
      metadata: {},
      readAt: new Date("2026-06-13T12:05:00.000Z"),
      createdAt
    });

    const read = await service.updateRead("u1", "ws1", "n1", { read: true });
    expect(read.readAt).toBeTruthy();

    prisma.notification.update.mockResolvedValue({
      id: "n1",
      workspaceId: "ws1",
      type: "TIMESHEET_STATUS",
      title: "Approved",
      body: "Done",
      metadata: {},
      readAt: null,
      createdAt
    });
    const unread = await service.updateRead("u1", "ws1", "n1", { read: false });
    expect(unread.readAt).toBeNull();
  });

  it("throws when notification is not owned", async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.updateRead("u1", "ws1", "missing", { read: true })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException && err.code === ErrorCodes.NOTIFICATION_NOT_FOUND
    );
  });

  it("marks all notifications read", async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });
    await expect(service.markAllRead("u1", "ws1", {})).resolves.toEqual({ updated: 4 });
  });

  it("publishes realtime event after createInApp", async () => {
    const createdAt = new Date("2026-06-13T12:00:00.000Z");
    prisma.notification.create.mockResolvedValue({
      id: "n-new",
      workspaceId: "ws1",
      type: "TIMESHEET_APPROVED",
      title: "Approved",
      body: "Done",
      metadata: { href: "/submissions" },
      readAt: null,
      createdAt
    });
    prisma.notification.count.mockResolvedValue(2);

    await service.createInApp({
      userId: "u1",
      workspaceId: "ws1",
      type: "TIMESHEET_APPROVED",
      title: "Approved",
      body: "Done",
      metadata: { href: "/submissions" }
    });

    await vi.waitFor(() => {
      expect(publish).toHaveBeenCalledWith("u1", {
        notification: expect.objectContaining({ id: "n-new" }),
        workspaceId: "ws1",
        unreadCount: 2
      });
    });
  });
});
