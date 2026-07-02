import type { PrismaService } from "../../src/common/prisma/prisma.service";

export async function setTenantSubscriptionStatus(
  prisma: PrismaService,
  tenantId: string,
  status: string
): Promise<void> {
  await prisma.tenantSubscription.update({
    where: { tenantId },
    data: { status }
  });
}
