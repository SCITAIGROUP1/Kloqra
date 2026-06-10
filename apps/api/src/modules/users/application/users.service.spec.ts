import { describe, expect, it, vi, beforeEach } from "vitest";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let service: UsersService;
  let mockPrisma: any;
  let mockAuth: any;

  const baseUser = {
    id: "user-1",
    email: "member@kloqra.dev",
    name: "Sam Rivera",
    firstName: "Sam",
    lastName: "Rivera",
    phone: null,
    location: null,
    avatarUrl: null,
    jobTitle: null,
    department: null,
    workStartDate: null,
    totpEnabledAt: null,
    passwordHash: "$2b$10$hashed",
    defaultHourlyRate: { toNumber: () => 100 },
    preferences: { dailyTargetHours: 6, theme: "dark" },
    createdAt: new Date("2025-01-01T00:00:00.000Z")
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUniqueOrThrow: vi.fn(),
        update: vi.fn()
      },
      workspace: {
        findUniqueOrThrow: vi.fn()
      },
      timeLog: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { durationSec: 3600 } })
      },
      teamMember: {
        count: vi.fn().mockResolvedValue(2)
      }
    };
    mockAuth = {
      revokeAllRefreshTokens: vi.fn()
    };
    service = new UsersService(mockPrisma, mockAuth);
  });

  it("returns profile with effective daily target from user preference", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      settings: { dailyTargetHours: 8 }
    });

    const profile = await service.getProfile("user-1", "ws-1");

    expect(profile.effectiveDailyTargetHours).toBe(6);
    expect(profile.preferences.dailyTargetHours).toBe(6);
    expect(profile.defaultHourlyRate).toBe(100);
    expect(profile.firstName).toBe("Sam");
    expect(profile.effectiveTheme).toBe("dark");
    expect(profile.activityStats.totalHours).toBe(1);
    expect(profile.activityStats.projectCount).toBe(2);
  });

  it("falls back to workspace daily target when user preference unset", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ ...baseUser, preferences: {} });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      settings: { dailyTargetHours: 7 }
    });

    const profile = await service.getProfile("user-1", "ws-1");
    expect(profile.effectiveDailyTargetHours).toBe(7);
  });

  it("merges preferences on update", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
    mockPrisma.user.update.mockImplementation(({ data }) => ({
      ...baseUser,
      preferences: data.preferences
    }));
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      settings: {}
    });

    const profile = await service.updatePreferences("user-1", "ws-1", {
      timezone: "America/New_York",
      theme: "light"
    });

    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(profile.preferences.timezone).toBe("America/New_York");
    expect(profile.preferences.theme).toBe("light");
  });

  it("clears saved timezone when browser default is selected", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      ...baseUser,
      preferences: { dailyTargetHours: 6, theme: "dark", timezone: "America/New_York" }
    });
    mockPrisma.user.update.mockImplementation(({ data }) => ({
      ...baseUser,
      preferences: data.preferences
    }));
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      settings: { timezone: "America/New_York" }
    });

    const profile = await service.updatePreferences("user-1", "ws-1", {
      timezone: null
    });

    expect(profile.preferences.timezone).toBeUndefined();
    expect(profile.effectiveTimezone).toBe("UTC");
  });

  it("updates profile names and composes display name", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
    mockPrisma.user.update.mockResolvedValue({
      ...baseUser,
      firstName: "Samuel",
      lastName: "Rivera",
      name: "Samuel Rivera"
    });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      settings: {}
    });

    const profile = await service.updateProfile("user-1", "ws-1", {
      firstName: "Samuel"
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Samuel",
          name: "Samuel Rivera"
        })
      })
    );
    expect(profile.name).toBe("Samuel Rivera");
  });
});
