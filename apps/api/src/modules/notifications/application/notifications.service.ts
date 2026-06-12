import type {
  ListNotificationsQuery,
  MarkAllNotificationsReadDto,
  NotificationDto,
  NotificationType,
  UpdateNotificationReadDto
} from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { DomainException } from "../../../common/errors/domain.exception";
import { paginationSkipTake, toPaginatedResponse } from "../../../common/http/pagination.util";
import { PrismaService } from "../../../common/prisma/prisma.service";

type NotificationRow = {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  body: string;
  metadata: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  toDto(row: NotificationRow): NotificationDto {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as NotificationDto["metadata"])
        : undefined;

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      ...(metadata ? { metadata } : {})
    };
  }

  async list(userId: string, workspaceId: string, query: ListNotificationsQuery) {
    const where = {
      userId,
      workspaceId,
      ...(query.unreadOnly ? { readAt: null } : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    return toPaginatedResponse(
      rows.map((row) => this.toDto(row)),
      total,
      query.page,
      query.limit
    );
  }

  async unreadCount(userId: string, workspaceId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, workspaceId, readAt: null }
    });
    return { count };
  }

  async updateRead(
    userId: string,
    workspaceId: string,
    id: string,
    dto: UpdateNotificationReadDto
  ) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId, workspaceId }
    });
    if (!existing) {
      throw new DomainException(
        ErrorCodes.NOTIFICATION_NOT_FOUND,
        "Notification not found",
        HttpStatus.NOT_FOUND
      );
    }

    const row = await this.prisma.notification.update({
      where: { id },
      data: { readAt: dto.read ? new Date() : null }
    });
    return this.toDto(row);
  }

  async markAllRead(userId: string, workspaceId: string, dto: MarkAllNotificationsReadDto) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        workspaceId,
        readAt: null,
        ...(dto.unreadOnly === false ? {} : { readAt: null })
      },
      data: { readAt: new Date() }
    });
    return { updated: result.count };
  }

  async createInApp(input: {
    userId: string;
    workspaceId: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }) {
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
    return this.toDto(row);
  }
}
