import { ErrorCodes, type PlanLimitExceededDetails, type PlanLimits } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { SubscriptionsService } from "./subscriptions.service";

@Injectable()
export class PlanLimitService {
  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService
  ) {}

  async getEffectiveLimits(tenantId: string): Promise<PlanLimits> {
    const subscription = await this.subscriptions.getSubscriptionForTenant(tenantId);
    return subscription.limits;
  }

  async getWorkspaceCount(tenantId: string): Promise<number> {
    return this.prisma.workspace.count({ where: { tenantId } as any });
  }

  private async loadSeatUserIds(tenantId: string): Promise<Set<string>> {
    const [tenantMembers, workspaceMembers] = await Promise.all([
      this.prisma.tenantMember.findMany({
        where: { tenantId, isActive: true },
        select: { userId: true }
      }),
      this.prisma.workspaceMember.findMany({
        where: { isActive: true, workspace: { tenantId } as any },
        select: { userId: true }
      })
    ]);
    return new Set([
      ...tenantMembers.map((member) => member.userId),
      ...workspaceMembers.map((member) => member.userId)
    ]);
  }

  async getSeatCount(tenantId: string): Promise<number> {
    const seatUserIds = await this.loadSeatUserIds(tenantId);
    return seatUserIds.size;
  }

  private throwPlanLimitExceeded(message: string, details: PlanLimitExceededDetails): never {
    throw new DomainException(
      ErrorCodes.PLAN_LIMIT_EXCEEDED,
      message,
      HttpStatus.PAYMENT_REQUIRED,
      details
    );
  }

  async assertWorkspaceCreateAllowed(tenantId: string): Promise<void> {
    const [limits, workspaceCount] = await Promise.all([
      this.getEffectiveLimits(tenantId),
      this.getWorkspaceCount(tenantId)
    ]);
    if (workspaceCount >= limits.maxWorkspaces) {
      this.throwPlanLimitExceeded(
        `Organization workspace limit reached (${workspaceCount}/${limits.maxWorkspaces}).`,
        { limit: "maxWorkspaces", current: workspaceCount, max: limits.maxWorkspaces }
      );
    }
  }

  async countNewSeatsForEmails(tenantId: string, emails: string[]): Promise<number> {
    const uniqueEmails = [
      ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))
    ];
    if (uniqueEmails.length === 0) return 0;

    const seatedUserIds = await this.loadSeatUserIds(tenantId);
    let additionalSeats = 0;

    for (const email of uniqueEmails) {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });
      if (user && seatedUserIds.has(user.id)) continue;
      additionalSeats += 1;
    }

    return additionalSeats;
  }

  async assertSeatsAvailable(tenantId: string, additionalSeats: number): Promise<void> {
    if (additionalSeats <= 0) return;

    const [limits, seatCount] = await Promise.all([
      this.getEffectiveLimits(tenantId),
      this.getSeatCount(tenantId)
    ]);
    if (seatCount + additionalSeats > limits.maxSeats) {
      this.throwPlanLimitExceeded(
        `Organization seat limit reached (${seatCount}/${limits.maxSeats}).`,
        { limit: "maxSeats", current: seatCount, max: limits.maxSeats }
      );
    }
  }

  async assertSeatsForEmails(tenantId: string, emails: string[]): Promise<void> {
    const additionalSeats = await this.countNewSeatsForEmails(tenantId, emails);
    await this.assertSeatsAvailable(tenantId, additionalSeats);
  }

  async getReportingApiKeyCount(tenantId: string): Promise<number> {
    return this.prisma.reportingApiCredential.count({
      where: { isActive: true, workspace: { tenantId } }
    });
  }

  async assertReportingApiKeysAllowed(tenantId: string): Promise<void> {
    const [limits, keyCount] = await Promise.all([
      this.getEffectiveLimits(tenantId),
      this.getReportingApiKeyCount(tenantId)
    ]);
    if (keyCount >= limits.maxReportingApiKeys) {
      this.throwPlanLimitExceeded(
        `Organization reporting API key limit reached (${keyCount}/${limits.maxReportingApiKeys}).`,
        { limit: "maxReportingApiKeys", current: keyCount, max: limits.maxReportingApiKeys }
      );
    }
  }
}
