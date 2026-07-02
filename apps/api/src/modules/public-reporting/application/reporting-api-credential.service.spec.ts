import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import type { PlanLimitService } from "../../subscriptions/application/plan-limit.service";
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

vi.mock("../../../common/tenant/assert-tenant-operations.util", () => ({
  assertTenantAllowsOperations: vi.fn().mockResolvedValue(undefined)
}));

describe("ReportingApiCredentialService", () => {
  let service: ReportingApiCredentialService;
  let mockPlanLimit: PlanLimitService;
  let mockPrisma: {
    workspace: { findUnique: ReturnType<typeof vi.fn> };
    reportingApiCredential: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    project: { count: ReturnType<typeof vi.fn> };
    tenant: { findUnique: ReturnType<typeof vi.fn> };
  };

  const workspaceId = "ws-1";
  const tenantId = "tenant-1";
  const projectId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlanLimit = {
      assertReportingApiKeysAllowed: vi.fn().mockResolvedValue(undefined)
    } as unknown as PlanLimitService;
    mockPrisma = {
      workspace: {
        findUnique: vi.fn().mockResolvedValue({ tenantId })
      },
      reportingApiCredential: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      project: { count: vi.fn().mockResolvedValue(1) },
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ status: "active" })
      }
    };
    service = new ReportingApiCredentialService(mockPrisma as never, mockPlanLimit);
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

    const result = await service.create(workspaceId, tenantId, {
      name: "Acme integration",
      projectIds: [projectId]
    });

    expect(mockPrisma.project.count).toHaveBeenCalledWith({
      where: { workspaceId, id: { in: [projectId] }, isActive: true }
    });
    expect(mockPlanLimit.assertReportingApiKeysAllowed).toHaveBeenCalledWith(tenantId);
    expect(result.apiKey).toMatch(/^klr_/);
    expect(result.secret).toMatch(/^sk_/);
    expect(result.name).toBe("Acme integration");
  });

  it("rejects create when workspace is outside tenant", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({ tenantId: "other-tenant" });

    await expect(
      service.create(workspaceId, tenantId, {
        name: "Bad",
        projectIds: [projectId]
      })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.FORBIDDEN &&
        err.getStatus() === HttpStatus.FORBIDDEN
    );
  });

  it("rejects invalid credentials", async () => {
    mockPrisma.reportingApiCredential.findUnique.mockResolvedValue(null);

    await expect(service.validate("klr_missing", "sk_bad")).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });

  it("validates active credentials and updates lastUsedAt", async () => {
    const { assertTenantAllowsOperations } =
      await import("../../../common/tenant/assert-tenant-operations.util");
    mockPrisma.reportingApiCredential.findUnique.mockResolvedValue({
      id: "cred-1",
      workspaceId,
      name: "Acme",
      apiKey: "klr_abc",
      secretHash: "hash",
      projectIds: [projectId],
      isActive: true,
      expiresAt: null,
      workspace: { tenantId }
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    mockPrisma.reportingApiCredential.update.mockResolvedValue({});

    const ctx = await service.validate("klr_abc", "sk_secret");

    expect(assertTenantAllowsOperations).toHaveBeenCalledWith(mockPrisma, tenantId);
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

  it("rejects validate when tenant is suspended", async () => {
    const { assertTenantAllowsOperations } =
      await import("../../../common/tenant/assert-tenant-operations.util");
    vi.mocked(assertTenantAllowsOperations).mockRejectedValueOnce(
      new DomainException(
        ErrorCodes.FORBIDDEN,
        "Organization account is suspended",
        HttpStatus.FORBIDDEN
      )
    );
    mockPrisma.reportingApiCredential.findUnique.mockResolvedValue({
      id: "cred-1",
      workspaceId,
      name: "Acme",
      apiKey: "klr_abc",
      secretHash: "hash",
      projectIds: [projectId],
      isActive: true,
      expiresAt: null,
      workspace: { tenantId }
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(service.validate("klr_abc", "sk_secret")).rejects.toMatchObject({
      code: ErrorCodes.FORBIDDEN
    });
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
