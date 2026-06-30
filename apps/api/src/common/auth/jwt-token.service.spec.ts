import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { JwtTokenService } from "./jwt-token.service";

describe("JwtTokenService", () => {
  let service: JwtTokenService;
  let mockJwt: { verify: ReturnType<typeof vi.fn> };
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_ACCESS_SECRET: "test-access-secret-min-32-chars-long" };
    mockJwt = { verify: vi.fn() };
    service = new JwtTokenService(mockJwt as never);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("isTokenExpired returns true for past exp", () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
    const token = `h.${payload}.s`;
    expect(service.isTokenExpired(token)).toBe(true);
  });

  it("verifyAccessToken rejects refresh typ", () => {
    mockJwt.verify.mockReturnValue({
      sub: "u1",
      workspaceId: "ws1",
      role: "MEMBER",
      typ: "refresh"
    });
    expect(() => service.verifyAccessToken("token")).toThrow(UnauthorizedException);
  });

  it("verifyAccessToken accepts access typ with claims", () => {
    mockJwt.verify.mockReturnValue({
      sub: "u1",
      workspaceId: "ws1",
      role: "ADMIN",
      typ: "access",
      scope: "admin"
    });
    const payload = service.verifyAccessToken("token", "admin");
    expect(payload.userId).toBe("u1");
    expect(payload.scope).toBe("admin");
  });

  it("verifyAccessToken maps TokenExpiredError", () => {
    const err = new Error("jwt expired");
    err.name = "TokenExpiredError";
    mockJwt.verify.mockImplementation(() => {
      throw err;
    });
    try {
      service.verifyAccessToken("token");
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(UnauthorizedException);
      expect((e as UnauthorizedException).getResponse()).toMatchObject({
        details: { reason: "token_expired" }
      });
    }
  });
});
