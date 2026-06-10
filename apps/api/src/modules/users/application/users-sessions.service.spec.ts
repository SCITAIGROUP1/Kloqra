import { describe, expect, it, vi, beforeEach } from "vitest";
import { UsersSessionsService } from "./users-sessions.service";

describe("UsersSessionsService", () => {
  let service: UsersSessionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      refreshToken: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn()
      }
    };
    service = new UsersSessionsService(mockPrisma);
  });

  it("lists active sessions for user", async () => {
    mockPrisma.refreshToken.findMany.mockResolvedValue([
      {
        id: "session-1",
        tokenHash: "abc",
        userAgent: "Chrome",
        ipAddress: "127.0.0.1",
        lastUsedAt: new Date("2026-01-01T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        expiresAt: new Date("2026-01-08T00:00:00.000Z")
      }
    ]);

    const sessions = await service.listSessions("user-1");

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.userAgent).toBe("Chrome");
    expect(sessions[0]?.isCurrent).toBe(false);
  });
});
