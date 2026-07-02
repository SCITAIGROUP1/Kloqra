import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateSecret, generateSync } from "../../../common/auth/otplib.util";
import { PlatformUsers2faService } from "./platform-users-2fa.service";

describe("PlatformUsers2faService", () => {
  let service: PlatformUsers2faService;
  let mockPrisma: {
    platformUser: {
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      platformUser: {
        findUniqueOrThrow: vi.fn(),
        update: vi.fn()
      }
    };
    service = new PlatformUsers2faService(mockPrisma as never);
  });

  it("stores secret when enabling 2FA", async () => {
    mockPrisma.platformUser.findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      totpEnabledAt: null
    });
    mockPrisma.platformUser.update.mockResolvedValue({});

    const result = await service.enable("p1", "platform@kloqra.dev");

    expect(result.secret).toBeTruthy();
    expect(result.otpauthUrl).toContain("otpauth://");
    expect(result.otpauthUrl).toContain("Kloqra%20Platform");
    expect(mockPrisma.platformUser.update).toHaveBeenCalled();
  });

  it("verifies code and enables 2FA", async () => {
    const secret = await generateSecret();
    const code = await generateSync({ secret });
    mockPrisma.platformUser.findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      totpSecret: secret
    });
    mockPrisma.platformUser.update.mockResolvedValue({});

    await service.verify("p1", { code });

    expect(mockPrisma.platformUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totpEnabledAt: expect.any(Date) })
      })
    );
  });
});
