import { randomBytes } from "node:crypto";
import {
  createReportingApiKeySchema,
  ErrorCodes,
  updateReportingApiKeySchema,
  type CreateReportingApiKeyDto,
  type CreateReportingApiKeyResponseDto,
  type ReportingApiKeyDto,
  type UpdateReportingApiKeyDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { hashPassword } from "../../../common/auth/password.util";
import type { ApiCredentialContext } from "../../../common/decorators/api-credential.decorator";
import { DomainException } from "../../../common/errors/domain.exception";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { assertTenantAllowsOperations } from "../../../common/tenant/assert-tenant-operations.util";
import { PlanLimitService } from "../../subscriptions/application/plan-limit.service";

function generateApiKey(): string {
  return `klr_${randomBytes(16).toString("hex")}`;
}

function generateSecret(): string {
  return `sk_${randomBytes(24).toString("hex")}`;
}

@Injectable()
export class ReportingApiCredentialService {
  constructor(
    private prisma: PrismaService,
    private planLimit: PlanLimitService
  ) {}

  async list(workspaceId: string, tenantId: string): Promise<ReportingApiKeyDto[]> {
    await this.assertWorkspaceInTenant(workspaceId, tenantId);
    const rows = await this.prisma.reportingApiCredential.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(
    workspaceId: string,
    tenantId: string,
    dto: CreateReportingApiKeyDto
  ): Promise<CreateReportingApiKeyResponseDto> {
    const parsed = createReportingApiKeySchema.parse(dto);
    await this.assertWorkspaceInTenant(workspaceId, tenantId);
    await this.assertProjectsInWorkspace(workspaceId, parsed.projectIds);
    await this.planLimit.assertReportingApiKeysAllowed(tenantId);

    const apiKey = generateApiKey();
    const secret = generateSecret();
    const secretHash = await hashPassword(secret);

    const row = await this.prisma.reportingApiCredential.create({
      data: {
        workspaceId,
        name: parsed.name,
        apiKey,
        secretHash,
        projectIds: parsed.projectIds,
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null
      }
    });

    return { ...this.toDto(row), secret };
  }

  async update(
    workspaceId: string,
    tenantId: string,
    id: string,
    dto: UpdateReportingApiKeyDto
  ): Promise<ReportingApiKeyDto> {
    const parsed = updateReportingApiKeySchema.parse(dto);
    await this.assertWorkspaceInTenant(workspaceId, tenantId);
    await this.getOrThrow(workspaceId, id);

    if (parsed.projectIds) {
      await this.assertProjectsInWorkspace(workspaceId, parsed.projectIds);
    }

    const row = await this.prisma.reportingApiCredential.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.projectIds !== undefined ? { projectIds: parsed.projectIds } : {}),
        ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
        ...(parsed.expiresAt !== undefined
          ? { expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null }
          : {})
      }
    });

    return this.toDto(row);
  }

  async revoke(workspaceId: string, tenantId: string, id: string): Promise<void> {
    await this.assertWorkspaceInTenant(workspaceId, tenantId);
    await this.getOrThrow(workspaceId, id);
    await this.prisma.reportingApiCredential.delete({ where: { id } });
  }

  async validate(apiKey: string, secret: string): Promise<ApiCredentialContext> {
    const row = await generatedPrisma(this.prisma).reportingApiCredential.findUnique({
      where: { apiKey },
      include: { workspace: { select: { tenantId: true } } }
    });

    if (!row || !row.isActive) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Invalid API credentials",
        HttpStatus.UNAUTHORIZED
      );
    }

    if (row.expiresAt && row.expiresAt < new Date()) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "API credentials expired",
        HttpStatus.UNAUTHORIZED
      );
    }

    const valid = await bcrypt.compare(secret, row.secretHash);
    if (!valid) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Invalid API credentials",
        HttpStatus.UNAUTHORIZED
      );
    }

    await assertTenantAllowsOperations(this.prisma, row.workspace.tenantId);

    await this.prisma.reportingApiCredential.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      credentialId: row.id,
      workspaceId: row.workspaceId,
      projectIds: row.projectIds,
      name: row.name
    };
  }

  assertProjectAccess(credential: ApiCredentialContext, projectId: string): void {
    if (!credential.projectIds.includes(projectId)) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Project not accessible with these API credentials",
        HttpStatus.FORBIDDEN
      );
    }
  }

  private async assertWorkspaceInTenant(workspaceId: string, tenantId: string): Promise<void> {
    const workspace = await generatedPrisma(this.prisma).workspace.findUnique({
      where: { id: workspaceId },
      select: { tenantId: true }
    });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }
    if (workspace.tenantId !== tenantId) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Workspace is not in your organization",
        HttpStatus.FORBIDDEN
      );
    }
  }

  private async getOrThrow(workspaceId: string, id: string) {
    const row = await this.prisma.reportingApiCredential.findFirst({
      where: { id, workspaceId }
    });
    if (!row) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Reporting API key not found",
        HttpStatus.NOT_FOUND
      );
    }
    return row;
  }

  private async assertProjectsInWorkspace(workspaceId: string, projectIds: string[]) {
    const count = await this.prisma.project.count({
      where: { workspaceId, id: { in: projectIds }, isActive: true }
    });
    if (count !== projectIds.length) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "One or more projects are invalid or inactive",
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private toDto(row: {
    id: string;
    name: string;
    apiKey: string;
    projectIds: string[];
    isActive: boolean;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): ReportingApiKeyDto {
    return {
      id: row.id,
      name: row.name,
      apiKey: row.apiKey,
      projectIds: row.projectIds,
      isActive: row.isActive,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    };
  }
}
