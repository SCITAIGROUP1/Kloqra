import * as bcrypt from "bcrypt";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AuthService } from "./auth.service";

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn()
  },
  compare: vi.fn(),
  hash: vi.fn()
}));

describe("AuthService unit tests", () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwt: any;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockPrisma = {} as any;
    mockJwt = {
      sign: vi.fn().mockReturnValue("mocked-token"),
      verify: vi.fn()
    } as any;
    authService = new AuthService(mockPrisma, mockJwt);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("signAccessToken", () => {
    it("throws an error if JWT_ACCESS_SECRET is not set", () => {
      delete process.env.JWT_ACCESS_SECRET;
      expect(() => authService.signAccessToken("user-1", "workspace-1", "ADMIN")).toThrow(
        "JWT_ACCESS_SECRET is not set on the API service"
      );
    });

    it("signs a token correctly if JWT_ACCESS_SECRET is set", () => {
      process.env.JWT_ACCESS_SECRET = "my-secret-key-32-chars-long-or-more";
      process.env.JWT_ACCESS_EXPIRES = "10m";

      const token = authService.signAccessToken("user-1", "workspace-1", "MEMBER");

      expect(token).toBe("mocked-token");
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { sub: "user-1", userId: "user-1", workspaceId: "workspace-1", role: "MEMBER" },
        { secret: "my-secret-key-32-chars-long-or-more", expiresIn: "10m" }
      );
    });
  });

  describe("verifyRefresh", () => {
    it("calls jwt.verify with the refresh secret", () => {
      process.env.JWT_REFRESH_SECRET = "refresh-secret";
      mockJwt.verify.mockReturnValue({ sub: "user-1", workspaceId: "ws-1", family: "fam-1" });

      const payload = authService.verifyRefresh("some-token");

      expect(payload).toEqual({ userId: "user-1", workspaceId: "ws-1", family: "fam-1" });
      expect(mockJwt.verify).toHaveBeenCalledWith("some-token", { secret: "refresh-secret" });
    });
  });

  describe("login", () => {
    it("throws UNAUTHORIZED for invalid credentials", async () => {
      mockPrisma.user = {
        findUnique: vi.fn().mockResolvedValue(null)
      };

      await expect(
        authService.login({ email: "missing@example.com", password: "wrong" })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("returns session for valid credentials", async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      mockPrisma.user = {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "admin@kloqra.dev",
          name: "Admin",
          passwordHash: "hash",
          defaultHourlyRate: null,
          memberships: [
            {
              workspaceId: "ws-1",
              role: "ADMIN",
              workspace: { id: "ws-1", name: "Kloqra" }
            }
          ]
        })
      };

      const session = await authService.login({
        email: "admin@kloqra.dev",
        password: "password123"
      });

      expect(session.workspaceId).toBe("ws-1");
      expect(session.workspaceRole).toBe("ADMIN");
      expect(session.user.email).toBe("admin@kloqra.dev");
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            memberships: expect.objectContaining({ orderBy: { createdAt: "asc" } })
          })
        })
      );
    });
  });
});
