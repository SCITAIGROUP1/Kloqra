import * as bcrypt from "bcrypt";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportingApiCredentialService } from "./reporting-api-credential.service";

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn()
  },
  compare: vi.fn()
}));

vi.mock("../../../common/auth/password.util", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-secret")
}));

describe("ReportingApiCredentialService", () => {
  let service: ReportingApiCredentialService;
  let mockPrisma: {
    reportingApiCredential: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    project: { count: ReturnType<typeof vi.fn> };
  };

  const workspaceId = "ws-1";
  const projectId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      reportingApiCredential: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      project: { count: vi.fn().mockResolvedValue(1) }
    };
    service = new ReportingApiCredentialService(mockPrisma as never);
  });

  it("creates a credential with api key and one-time secret", async () => {
    const createdAt = new Date("2026-06-01T00:00:00.000Z");
    mockPrisma.reportingApiCredential.create.mockResolvedValue({
      id: "cred-1",
      name: "Acme integration",
      apiKey: "klr_abc",
      projectIds: [projectId],
      isActive: true,
      lastUsedAt: null,
      expiresAt: null,
      createdAt
    });

    const result = await service.create(workspaceId, {
      name: "Acme integration",
      projectIds: [projectId]
    });

    expect(mockPrisma.project.count).toHaveBeenCalledWith({
      where: { workspaceId, id: { in: [projectId] }, isActive: true }
    });
    expect(result.apiKey).toMatch(/^klr_/);
    expect(result.secret).toMatch(/^sk_/);
    expect(result.name).toBe("Acme integration");
  });

  it("rejects invalid credentials", async () => {
    mockPrisma.reportingApiCredential.findUnique.mockResolvedValue(null);

    await expect(service.validate("klr_missing", "sk_bad")).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });

  it("validates active credentials and updates lastUsedAt", async () => {
    mockPrisma.reportingApiCredential.findUnique.mockResolvedValue({
      id: "cred-1",
      workspaceId,
      name: "Acme",
      apiKey: "klr_abc",
      secretHash: "hash",
      projectIds: [projectId],
      isActive: true,
      expiresAt: null
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    mockPrisma.reportingApiCredential.update.mockResolvedValue({});

    const ctx = await service.validate("klr_abc", "sk_secret");

    expect(ctx).toEqual({
      credentialId: "cred-1",
      workspaceId,
      projectIds: [projectId],
      name: "Acme"
    });
    expect(mockPrisma.reportingApiCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cred-1" } })
    );
  });

  it("assertProjectAccess throws when project is not in scope", () => {
    expect(() =>
      service.assertProjectAccess(
        { credentialId: "c1", workspaceId, projectIds: [projectId], name: "x" },
        "other-project"
      )
    ).toThrow();
  });
});
