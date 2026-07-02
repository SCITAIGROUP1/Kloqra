import {
  buildPaginationMeta,
  type ListPlatformAuditEventsQuery,
  type ListPlatformAuditEventsResponseDto,
  type PlatformAuditAction
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../../../prisma/generated/client";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";

export type PlatformAuditContext = {
  actorPlatformUserId: string;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class PlatformAuditService {
  constructor(private prisma: PrismaService) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  async recordEvent(input: {
    context: PlatformAuditContext;
    action: PlatformAuditAction;
    tenantId?: string | null;
    summary: Record<string, unknown>;
  }): Promise<void> {
    await this.db().platformAuditEvent.create({
      data: {
        actorPlatformUserId: input.context.actorPlatformUserId,
        action: input.action,
        tenantId: input.tenantId ?? null,
        summary: input.summary as Prisma.InputJsonValue,
        ipAddress: input.context.ipAddress ?? null,
        userAgent: input.context.userAgent?.slice(0, 512) ?? null
      }
    });
  }

  async list(query: ListPlatformAuditEventsQuery): Promise<ListPlatformAuditEventsResponseDto> {
    const { page, limit, tenantId, action, from, to } = query;
    const where: Prisma.PlatformAuditEventWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(action ? { action } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {})
            }
          }
        : {})
    };

    const [total, events] = await Promise.all([
      this.db().platformAuditEvent.count({ where }),
      this.db().platformAuditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: { select: { email: true, name: true } }
        }
      })
    ]);

    return {
      ...buildPaginationMeta(total, page, limit),
      items: events.map((event) => ({
        id: event.id,
        actorPlatformUserId: event.actorPlatformUserId,
        actorEmail: event.actor.email,
        actorName: event.actor.name,
        action: event.action as PlatformAuditAction,
        tenantId: event.tenantId,
        summary: event.summary as Record<string, unknown>,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        createdAt: event.createdAt.toISOString()
      }))
    };
  }
}
