import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthRevocationService } from "../auth/auth-revocation.service";
import { JwtTokenService } from "../auth/jwt-token.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let jwtTokens: {
    isTokenExpired: ReturnType<typeof vi.fn>;
    verifyAccessToken: ReturnType<typeof vi.fn>;
    toRequestUser: ReturnType<typeof vi.fn>;
  };
  let authRevocation: { assertNotRevoked: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    jwtTokens = {
      isTokenExpired: vi.fn(),
      verifyAccessToken: vi.fn(),
      toRequestUser: vi.fn()
    };
    authRevocation = { assertNotRevoked: vi.fn().mockResolvedValue(undefined) };
    guard = new JwtAuthGuard(
      jwtTokens as unknown as JwtTokenService,
      authRevocation as unknown as AuthRevocationService
    );
  });

  function contextWithReq(req: Record<string, unknown>) {
    return {
      switchToHttp: () => ({
        getRequest: () => req
      })
    };
  }

  it("throws token_expired when bearer is expired and no valid cookie", async () => {
    jwtTokens.isTokenExpired.mockReturnValue(true);
    const req = {
      headers: { authorization: "Bearer expired-bearer", "x-auth-scope": "client" },
      cookies: {}
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).rejects.toThrow(
      UnauthorizedException
    );
    try {
      await guard.canActivate(contextWithReq(req) as never);
    } catch (e) {
      expect((e as UnauthorizedException).getResponse()).toMatchObject({
        details: { reason: "token_expired" }
      });
    }
  });

  it("uses valid cookie when bearer is expired", async () => {
    jwtTokens.isTokenExpired.mockImplementation((t: string) => t === "expired-bearer");
    jwtTokens.verifyAccessToken.mockReturnValue({
      sub: "u1",
      userId: "u1",
      workspaceId: "ws1",
      role: "MEMBER",
      family: "fam-1"
    });
    jwtTokens.toRequestUser.mockReturnValue({
      userId: "u1",
      workspaceId: "ws1",
      role: "MEMBER"
    });
    const req = {
      headers: { authorization: "Bearer expired-bearer", "x-auth-scope": "client" },
      cookies: { access_token_client: "valid-cookie" }
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).resolves.toBe(true);
    expect(jwtTokens.verifyAccessToken).toHaveBeenCalledWith("valid-cookie", "client");
    expect(authRevocation.assertNotRevoked).toHaveBeenCalledWith("u1", "fam-1");
  });

  it("rejects revoked sessions", async () => {
    jwtTokens.isTokenExpired.mockReturnValue(false);
    jwtTokens.verifyAccessToken.mockReturnValue({
      sub: "u1",
      workspaceId: "ws1",
      family: "fam-1"
    });
    authRevocation.assertNotRevoked.mockRejectedValue(
      new UnauthorizedException({
        details: { reason: "session_revoked" }
      })
    );
    const req = {
      headers: { authorization: "Bearer valid", "x-auth-scope": "client" },
      cookies: {}
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).rejects.toThrow(
      UnauthorizedException
    );
  });
});
