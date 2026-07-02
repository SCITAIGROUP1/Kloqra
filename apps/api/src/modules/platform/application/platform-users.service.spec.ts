import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlatformUsersService } from "./platform-users.service";

describe("PlatformUsersService", () => {
  const mockUser = {
    id: "p1",
    email: "platform@kloqra.dev",
    name: "Platform Admin",
    role: "SUPERADMIN",
    preferences: { theme: "dark" },
    totpEnabledAt: null
  };

  const mockPrisma = {
    platformUser: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn()
    },
    platformRefreshToken: {
      findMany: vi.fn(),
      updateMany: vi.fn()
    }
  };

  let service: PlatformUsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlatformUsersService(
      mockPrisma as never,
      {} as never,
      { revokeUser: vi.fn(), revokeFamily: vi.fn() } as never
    );
    mockPrisma.platformUser.findUniqueOrThrow.mockResolvedValue(mockUser);
    mockPrisma.platformUser.update.mockResolvedValue(mockUser);
  });

  it("maps platform profile dto", async () => {
    const profile = await service.getProfile("p1");
    expect(profile).toMatchObject({
      id: "p1",
      email: "platform@kloqra.dev",
      name: "Platform Admin",
      platformRole: "SUPERADMIN",
      effectiveTheme: "dark",
      twoFactorEnabled: false
    });
  });

  it("updates display name", async () => {
    mockPrisma.platformUser.update.mockResolvedValue({ ...mockUser, name: "Ops Lead" });
    const profile = await service.updateProfile("p1", { name: "Ops Lead" });
    expect(profile.name).toBe("Ops Lead");
  });
});
