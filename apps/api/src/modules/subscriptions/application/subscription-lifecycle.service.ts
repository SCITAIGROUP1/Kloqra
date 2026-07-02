import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class SubscriptionLifecycleService {
  constructor(private prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ? generatedPrisma(tx) : generatedPrisma(this.prisma);
  }

  async recordEvent(
    tenantId: string,
    data: {
      eventType: string; // 'created' | 'plan_changed' | 'status_changed' | 'period_renewed' | 'trial_started' | 'trial_ended' | 'canceled'
      occurredAt?: Date;
      fromPlanId?: string | null;
      toPlanId?: string | null;
      fromStatus?: string | null;
      toStatus?: string | null;
      actorType: "system" | "platform_user" | "tenant_owner";
      actorId?: string | null;
      metadata?: Record<string, any> | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = this.db(tx);
    const occurredAt = data.occurredAt || new Date();

    const subscription = await db.tenantSubscription.findUnique({
      where: { tenantId }
    });

    if (!subscription) {
      // If subscription doesn't exist yet, we can't record the event.
      // But if it's the 'created' event, the subscription should have been created first.
      return;
    }

    const fromPlanId = data.fromPlanId !== undefined ? data.fromPlanId : subscription.planId;
    const toPlanId = data.toPlanId !== undefined ? data.toPlanId : subscription.planId;
    const fromStatus = data.fromStatus !== undefined ? data.fromStatus : subscription.status;
    const toStatus = data.toStatus !== undefined ? data.toStatus : subscription.status;

    await db.tenantSubscriptionEvent.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        eventType: data.eventType,
        occurredAt,
        fromPlanId:
          data.eventType === "plan_changed" || fromPlanId !== toPlanId ? fromPlanId : null,
        toPlanId: data.eventType === "plan_changed" || fromPlanId !== toPlanId ? toPlanId : null,
        fromStatus:
          data.eventType === "status_changed" || fromStatus !== toStatus ? fromStatus : null,
        toStatus: data.eventType === "status_changed" || fromStatus !== toStatus ? toStatus : null,
        actorType: data.actorType,
        actorId: data.actorId || null,
        metadata: data.metadata ? (data.metadata as any) : Prisma.DbNull
      }
    });

    // If the plan changed, update the plan_assigned_at date on the subscription
    if (fromPlanId !== toPlanId) {
      await db.tenantSubscription.update({
        where: { tenantId },
        data: {
          planAssignedAt: occurredAt
        }
      });
    }
  }
}
