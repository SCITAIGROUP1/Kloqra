import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";
import { generatedPrisma } from "../prisma/generated-prisma.util";
import type { PrismaService } from "../prisma/prisma.service";

const BLOCKED_TENANT_STATUSES = new Set(["suspended", "churned"]);

export async function assertTenantAllowsOperations(
  prisma: PrismaService,
  tenantId: string
): Promise<void> {
  const tenant = await generatedPrisma(prisma).tenant.findUnique({
    where: { id: tenantId },
    select: { status: true }
  });
  if (!tenant) {
    throw new DomainException(ErrorCodes.NOT_FOUND, "Organization not found", HttpStatus.NOT_FOUND);
  }
  if (BLOCKED_TENANT_STATUSES.has(tenant.status)) {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      tenant.status === "churned"
        ? "Organization account is no longer active"
        : "Organization account is suspended",
      HttpStatus.FORBIDDEN,
      { tenantStatus: tenant.status }
    );
  }
}
