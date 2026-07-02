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
    const mockAuthRevocation = { revokeUser: vi.fn() };
    const mockAccess = { assertCanAccessProject: vi.fn() };
    service = new UsersService(
      mockPrisma,
      mockAuth,
      mockAuthRevocation as never,
      mockAccess as never
    );
  });

  it("returns profile with effective daily target from user preference", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      name: "Acme Corporation",
      settings: { dailyTargetHours: 8 },
      tenant: { name: "Acme Corporation", slug: "acme" }
    });

    const profile = await service.getProfile("user-1", "ws-1", "ADMIN");

    expect(profile.effectiveDailyTargetHours).toBe(6);
    expect(profile.effectiveTimerStaleWarningHours).toBe(8);
    expect(profile.preferences.dailyTargetHours).toBe(6);
    expect(profile.defaultHourlyRate).toBe(100);
    expect(profile.firstName).toBe("Sam");
    expect(profile.effectiveTheme).toBe("dark");
    expect(profile.activityStats.totalHours).toBe(1);
    expect(profile.activityStats.projectCount).toBe(2);
    expect(profile.workContext).toEqual({
      organizationName: "Acme Corporation",
      workspaceName: "Acme Corporation",
      workspaceRole: "ADMIN"
    });
  });

  it("falls back to workspace daily target when user preference unset", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ ...baseUser, preferences: {} });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      name: "Acme Corporation",
      settings: { dailyTargetHours: 7 },
      tenant: { name: "Acme Corporation", slug: "acme" }
    });

    const profile = await service.getProfile("user-1", "ws-1", "MEMBER");
    expect(profile.effectiveDailyTargetHours).toBe(7);
    expect(profile.defaultHourlyRate).toBeUndefined();
  });

  it("omits defaultHourlyRate for member profile", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      name: "Acme Corporation",
      settings: {},
      tenant: { name: "Acme Corporation", slug: "acme" }
    });

    const profile = await service.getProfile("user-1", "ws-1", "MEMBER");
    expect(profile.defaultHourlyRate).toBeUndefined();
  });

  it("merges preferences on update", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
    mockPrisma.user.update.mockImplementation(({ data }) => ({
      ...baseUser,
      preferences: data.preferences
    }));
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      name: "Acme Corporation",
      settings: {},
      tenant: { name: "Acme Corporation", slug: "acme" }
    });

    const profile = await service.updatePreferences(
      "user-1",
      "ws-1",
      {
        timezone: "America/New_York",
        theme: "light"
      },
      "ADMIN"
    );

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
      name: "Acme Corporation",
      settings: { timezone: "America/New_York" },
      tenant: { name: "Acme Corporation", slug: "acme" }
    });

    const profile = await service.updatePreferences(
      "user-1",
      "ws-1",
      {
        timezone: null
      },
      "ADMIN"
    );

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
      name: "Acme Corporation",
      settings: {},
      tenant: { name: "Acme Corporation", slug: "acme" }
    });

    const profile = await service.updateProfile(
      "user-1",
      "ws-1",
      {
        firstName: "Samuel"
      },
      "ADMIN"
    );

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

  it("returns saved dashboard layout for workspace and app", async () => {
    const workspaceId = "00000000-0000-4000-8000-000000000001";
    const layout = [{ i: "stat_total_hours", x: 0, y: 0, w: 3, h: 2, visible: true }];
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      preferences: {
        dashboardLayouts: {
          [workspaceId]: {
            client: { layout, defaultLayout: layout }
          }
        }
      }
    });

    const result = await service.getDashboardLayout("user-1", workspaceId, "client");

    expect(result.layout).toEqual(layout);
    expect(result.defaultLayout).toEqual(layout);
  });

  it("persists dashboard layout updates in user preferences", async () => {
    const workspaceId = "00000000-0000-4000-8000-000000000001";
    const layout = [{ i: "stat_total_hours", x: 0, y: 0, w: 3, h: 2, visible: true }];
    mockPrisma.user.findUniqueOrThrow
      .mockResolvedValueOnce({ preferences: {} })
      .mockResolvedValueOnce({
        preferences: {
          dashboardLayouts: {
            [workspaceId]: { admin: { layout } }
          }
        }
      });
    mockPrisma.user.update.mockResolvedValue(baseUser);

    const result = await service.updateDashboardLayout("user-1", workspaceId, {
      app: "admin",
      layout
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preferences: expect.objectContaining({
            dashboardLayouts: expect.objectContaining({
              [workspaceId]: expect.objectContaining({
                admin: expect.objectContaining({ layout })
              })
            })
          })
        })
      })
    );
    expect(result.layout).toEqual(layout);
  });

  it("sets jiraConnected true when user has jiraEmail and workspace has jira credentials", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      ...baseUser,
      jiraEmail: "alice@acme.com"
    });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      name: "Acme Corporation",
      settings: {
        jiraSiteUrl: "https://acme.atlassian.net",
        jiraServiceEmail: "bot@acme.com",
        jiraServiceToken: "ATATT3xtoken"
      },
      tenant: { name: "Acme Corporation", slug: "acme" }
    });

    const profile = await service.getProfile("user-1", "ws-1", "MEMBER");

    expect(profile.jiraEmail).toBe("alice@acme.com");
    expect(profile.jiraConnected).toBe(true);
    expect(profile.workspaceJiraSiteUrl).toBe("https://acme.atlassian.net");
  });

  it("sets jiraConnected false when workspace has no jira token", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      ...baseUser,
      jiraEmail: "alice@acme.com"
    });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      name: "Acme Corporation",
      settings: { jiraSiteUrl: "https://acme.atlassian.net" },
      tenant: { name: "Acme Corporation", slug: "acme" }
    });

    const profile = await service.getProfile("user-1", "ws-1", "MEMBER");

    expect(profile.jiraConnected).toBe(false);
  });

  it("sets jiraConnected false when user has no jiraEmail", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      ...baseUser,
      jiraEmail: null
    });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      name: "Acme Corporation",
      settings: {
        jiraSiteUrl: "https://acme.atlassian.net",
        jiraServiceToken: "ATATT3xtoken"
      },
      tenant: { name: "Acme Corporation", slug: "acme" }
    });

    const profile = await service.getProfile("user-1", "ws-1", "MEMBER");

    expect(profile.jiraConnected).toBe(false);
    expect(profile.jiraEmail).toBeNull();
  });
});
