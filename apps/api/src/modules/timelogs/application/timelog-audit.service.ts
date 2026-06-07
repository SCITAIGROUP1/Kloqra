import type {
  ListTimelogAuditEventsResponseDto,
  TimelogAuditAction,
  TimelogAuditSnapshot
} from "@chronomint/contracts";
import { ErrorCodes } from "@chronomint/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class TimelogAuditService {
  constructor(private prisma: PrismaService) {}

  snapshotFromLog(log: {
    taskId: string;
    startTime: Date;
    endTime: Date;
    durationSec: number;
    description: string | null;
    isBillable: boolean;
    source: string;
  }): TimelogAuditSnapshot {
    return {
      taskId: log.taskId,
      startTime: log.startTime.toISOString(),
      endTime: log.endTime.toISOString(),
      durationSec: log.durationSec,
      description: log.description,
      isBillable: log.isBillable,
      source: log.source as "manual" | "timer"
    };
  }

  async recordEvent(
    tx: Prisma.TransactionClient,
    input: {
      workspaceId: string;
      timeLogId: string;
      entryUserId: string;
      actorId: string;
      action: TimelogAuditAction;
      before: TimelogAuditSnapshot | null;
      after: TimelogAuditSnapshot | null;
    }
  ) {
    await tx.timeLogAuditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        timeLogId: input.timeLogId,
        entryUserId: input.entryUserId,
        actorId: input.actorId,
        action: input.action,
        before: input.before ?? undefined,
        after: input.after ?? undefined
      }
    });
  }

  async listForTimeLog(
    workspaceId: string,
    requesterId: string,
    role: string,
    timeLogId: string
  ): Promise<ListTimelogAuditEventsResponseDto> {
    const log = await this.prisma.timeLog.findFirst({
      where: { id: timeLogId, task: { project: { workspaceId } } },
      select: { userId: true }
    });
    if (!log) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "TimeLog not found", HttpStatus.NOT_FOUND);
    }
    if (role !== "ADMIN" && log.userId !== requesterId) {
      throw new DomainException(ErrorCodes.FORBIDDEN, "Not your entry", HttpStatus.FORBIDDEN);
    }

    const events = await this.prisma.timeLogAuditEvent.findMany({
      where: { timeLogId },
      orderBy: { createdAt: "desc" }
    });

    const actorIds = [...new Set(events.map((e) => e.actorId))];
    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true }
          })
        : [];
    const actorNameById = new Map(actors.map((a) => [a.id, a.name]));

    return {
      items: events.map((e) => ({
        id: e.id,
        timeLogId: e.timeLogId,
        entryUserId: e.entryUserId,
        actorId: e.actorId,
        actorName: actorNameById.get(e.actorId) ?? "Unknown",
        action: e.action as TimelogAuditAction,
        before: (e.before as TimelogAuditSnapshot | null) ?? null,
        after: (e.after as TimelogAuditSnapshot | null) ?? null,
        createdAt: e.createdAt.toISOString()
      }))
    };
  }
}
