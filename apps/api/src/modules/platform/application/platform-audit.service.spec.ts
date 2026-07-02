import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlatformAuditService } from "./platform-audit.service";

describe("PlatformAuditService", () => {
  let service: PlatformAuditService;
  let mockPrisma: {
    platformAuditEvent: {
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  const actorId = "00000000-0000-4000-8000-000000000001";
  const tenantId = "00000000-0000-4000-8000-000000000002";

  beforeEach(() => {
    mockPrisma = {
      platformAuditEvent: {
        create: vi.fn().mockResolvedValue({ id: "event-1" }),
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "event-1",
            actorPlatformUserId: actorId,
            action: "platform.tenant.created",
            tenantId,
            summary: { organizationName: "Acme" },
            ipAddress: "127.0.0.1",
            userAgent: "vitest",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            actor: { email: "platform@kloqra.dev", name: "Platform Admin" }
          }
        ])
      }
    };
    service = new PlatformAuditService(mockPrisma as never);
  });

  it("records audit event with request metadata", async () => {
    await service.recordEvent({
      context: {
        actorPlatformUserId: actorId,
        ipAddress: "127.0.0.1",
        userAgent: "vitest-agent"
      },
      action: "platform.tenant.created",
      tenantId,
      summary: { organizationName: "Acme" }
    });

    expect(mockPrisma.platformAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorPlatformUserId: actorId,
        action: "platform.tenant.created",
        tenantId,
        ipAddress: "127.0.0.1",
        userAgent: "vitest-agent"
      })
    });
  });

  it("truncates long user agent strings", async () => {
    const longAgent = "x".repeat(600);
    await service.recordEvent({
      context: { actorPlatformUserId: actorId, userAgent: longAgent },
      action: "platform.login",
      summary: { email: "platform@kloqra.dev" }
    });

    expect(mockPrisma.platformAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userAgent: "x".repeat(512)
      })
    });
  });

  it("lists audit events with actor details", async () => {
    const result = await service.list({ page: 1, limit: 25 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      actorEmail: "platform@kloqra.dev",
      actorName: "Platform Admin",
      action: "platform.tenant.created",
      tenantId
    });
  });
});
