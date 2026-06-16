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
    authService = new AuthService(mockPrisma, mockJwt, {
      sendPasswordReset: vi.fn().mockResolvedValue({ sent: true }),
      sendEmailVerification: vi.fn().mockResolvedValue({ sent: true })
    } as never);
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
        {
          sub: "user-1",
          userId: "user-1",
          workspaceId: "workspace-1",
          role: "MEMBER",
          typ: "access"
        },
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
          firstName: "Avery",
          lastName: "Admin",
          passwordHash: "hash",
          mustChangePassword: false,
          emailVerifiedAt: new Date("2025-01-01"),
          totpEnabledAt: null,
          totpSecret: null,
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

      const result = await authService.login({
        email: "admin@kloqra.dev",
        password: "password123"
      });

      if ("requires2fa" in result) {
        expect.fail("expected session, got 2FA challenge");
      }
      if ("requiresPasswordChange" in result) {
        expect.fail("expected session, got password change challenge");
      }
      if ("requiresEmailVerification" in result) {
        expect.fail("expected session, got email verification challenge");
      }

      expect(result.workspaceId).toBe("ws-1");
      expect(result.workspaceRole).toBe("ADMIN");
      expect(result.user.email).toBeUndefined();
      expect(result.user.defaultHourlyRate).toBeNull();
      expect(result.user.firstName).toBe("Avery");
      expect(result.user.lastName).toBe("Admin");
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            memberships: expect.objectContaining({ orderBy: { createdAt: "asc" } })
          })
        })
      );
    });

    it("rejects login when all memberships are deactivated", async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      mockPrisma.user = {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "inactive@kloqra.dev",
          passwordHash: "hash",
          mustChangePassword: false,
          emailVerifiedAt: new Date("2025-01-01"),
          totpEnabledAt: null,
          totpSecret: null,
          memberships: []
        })
      };

      await expect(
        authService.login({ email: "inactive@kloqra.dev", password: "password123" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("returns requiresPasswordChange when mustChangePassword is set", async () => {
      process.env.JWT_ACCESS_SECRET = "my-secret-key-32-chars-long-or-more";
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      mockPrisma.user = {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "new@kloqra.dev",
          passwordHash: "hash",
          mustChangePassword: true,
          memberships: []
        })
      };

      const result = await authService.login({
        email: "new@kloqra.dev",
        password: "temp-pass"
      });

      expect(result).toEqual({
        requiresPasswordChange: true,
        pendingToken: "mocked-token"
      });
    });
  });

  describe("impersonation handoff", () => {
    it("issues and verifies signed handoff tokens", async () => {
      process.env.JWT_REFRESH_SECRET = "ci-refresh-secret-min-32-chars-long";
      const impersonationResult = {
        session: {
          user: {
            id: "target-user",
            name: "Sam Rivera"
          },
          workspaceId: "ws-1",
          workspaceRole: "MEMBER" as const,
          impersonatorId: "admin-user",
          impersonatorName: "Admin"
        },
        accessToken: "access-token",
        refreshToken: "refresh-token"
      };

      mockJwt.sign.mockImplementation((payload: Record<string, unknown>) => {
        if (payload.typ === "impersonation_handoff") return "signed-handoff-token";
        return "mocked-token";
      });
      mockJwt.verify.mockImplementation((token: string) => {
        if (token !== "signed-handoff-token") throw new Error("invalid token");
        return {
          typ: "impersonation_handoff",
          sub: "target-user",
          workspaceId: "ws-1",
          impersonatorId: "admin-user"
        };
      });

      const service = new AuthService(mockPrisma, mockJwt, {
        sendPasswordReset: vi.fn(),
        sendEmailVerification: vi.fn()
      } as never);

      vi.spyOn(service, "impersonate").mockResolvedValue(impersonationResult);

      const { handoffToken } = await service.createImpersonationHandoff(
        "admin-user",
        "ws-1",
        "target-user"
      );
      expect(handoffToken).toBe("signed-handoff-token");

      const consumed = await service.consumeImpersonationHandoff(handoffToken);
      expect(consumed).toEqual(impersonationResult);
      expect(service.impersonate).toHaveBeenCalledTimes(2);
    });
  });

  describe("impersonate admin guard", () => {
    it("throws forbidden if target user is an ADMIN", async () => {
      mockPrisma.user = {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "admin-1", name: "Admin One" })
      };
      mockPrisma.workspaceMember = {
        findUnique: vi.fn().mockResolvedValue({
          userId: "admin-2",
          workspaceId: "ws-1",
          role: "ADMIN",
          user: { id: "admin-2", name: "Admin Two" },
          workspace: { id: "ws-1", name: "Workspace" }
        })
      };

      await expect(authService.impersonate("admin-1", "ws-1", "admin-2")).rejects.toMatchObject({
        code: "FORBIDDEN"
      });
    });

    it("succeeds if target user is a MEMBER", async () => {
      process.env.JWT_REFRESH_SECRET = "ci-refresh-secret-min-32-chars-long";
      process.env.JWT_ACCESS_SECRET = "ci-access-secret-min-32-chars-long";
      mockPrisma.user = {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "admin-1", name: "Admin One" })
      };
      mockPrisma.workspaceMember = {
        findUnique: vi.fn().mockResolvedValue({
          userId: "member-1",
          workspaceId: "ws-1",
          role: "MEMBER",
          user: { id: "member-1", name: "Member One" },
          workspace: { id: "ws-1", name: "Workspace" }
        })
      };
      mockPrisma.refreshToken = {
        create: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 })
      };

      const result = await authService.impersonate("admin-1", "ws-1", "member-1");
      expect(result.session.workspaceRole).toBe("MEMBER");
      expect(result.session.impersonatorId).toBe("admin-1");
    });
  });

  describe("JWT duration parsing", () => {
    it("handles custom duration string like 30d", async () => {
      process.env.JWT_REFRESH_SECRET = "ci-refresh-secret-min-32-chars-long";
      process.env.JWT_REFRESH_EXPIRES = "30d";
      mockPrisma.refreshToken = {
        create: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 })
      };

      const { family } = await authService.signAndStoreRefreshToken("user-1", "ws-1");
      expect(family).toBeDefined();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date)
          })
        })
      );
      const callArgs = mockPrisma.refreshToken.create.mock.calls[0][0];
      const expiresAt = callArgs.data.expiresAt.getTime();
      const expectedDiff = 30 * 24 * 60 * 60 * 1000;
      expect(expiresAt - Date.now()).toBeLessThanOrEqual(expectedDiff + 1000);
      expect(expiresAt - Date.now()).toBeGreaterThanOrEqual(expectedDiff - 5000);
    });
  });
});
