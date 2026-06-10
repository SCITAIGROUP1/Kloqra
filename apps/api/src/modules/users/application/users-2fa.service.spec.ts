import { generateSecret, generateSync } from "otplib";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Users2faService } from "./users-2fa.service";

describe("Users2faService", () => {
  let service: Users2faService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUniqueOrThrow: vi.fn(),
        update: vi.fn()
      }
    };
    service = new Users2faService(mockPrisma);
  });

  it("stores secret when enabling 2FA", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      totpEnabledAt: null
    });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.enable("user-1", "user@example.com");

    expect(result.secret).toBeTruthy();
    expect(result.otpauthUrl).toContain("otpauth://");
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });

  it("verifies code and enables 2FA", async () => {
    const secret = generateSecret();
    const code = generateSync({ secret });
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      totpSecret: secret
    });
    mockPrisma.user.update.mockResolvedValue({});

    await service.verify("user-1", { code });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totpEnabledAt: expect.any(Date) })
      })
    );
  });
});
