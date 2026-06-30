import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthRevocationService } from "./auth-revocation.service";

describe("AuthRevocationService", () => {
  let service: AuthRevocationService;
  const redis = {
    setex: vi.fn(),
    get: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthRevocationService({ getClient: () => redis } as never);
  });

  it("revokeFamily stores redis key with ttl", async () => {
    await service.revokeFamily("family-1");
    expect(redis.setex).toHaveBeenCalledWith(
      "auth:revoked-family:family-1",
      expect.any(Number),
      "1"
    );
  });

  it("assertNotRevoked throws when family revoked", async () => {
    redis.get.mockImplementation(async (key: string) => (key.includes("family-1") ? "1" : null));
    await expect(service.assertNotRevoked("user-1", "family-1")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
