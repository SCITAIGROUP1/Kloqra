import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AuthService } from "./auth.service";

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
});
