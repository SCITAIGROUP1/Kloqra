import type {
  ListPlatformNotificationsQuery,
  MarkAllPlatformNotificationsReadDto,
  PlatformNotificationDto,
  PlatformNotificationType,
  UpdatePlatformNotificationReadDto
} from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import type { Prisma } from "@prisma/client";
import { DomainException } from "../../../common/errors/domain.exception";
import { paginationSkipTake, toPaginatedResponse } from "../../../common/http/pagination.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { PlatformNotificationsRealtimeService } from "./platform-notifications-realtime.service";

type PlatformNotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class PlatformNotificationsService {
  private readonly logger = new Logger(PlatformNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private realtime: PlatformNotificationsRealtimeService
  ) {}

  toDto(row: PlatformNotificationRow): PlatformNotificationDto {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as PlatformNotificationDto["metadata"])
        : undefined;

    return {
      id: row.id,
      type: row.type as PlatformNotificationType,
      title: row.title,
      body: row.body,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      ...(metadata ? { metadata } : {})
    };
  }

  async list(platformUserId: string, query: ListPlatformNotificationsQuery) {
    const unreadOnly = query.unreadOnly === true;
    const where = {
      platformUserId,
      ...(unreadOnly ? { readAt: null } : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.platformNotification.count({ where }),
      this.prisma.platformNotification.findMany({
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

  async unreadCount(platformUserId: string) {
    const count = await this.prisma.platformNotification.count({
      where: { platformUserId, readAt: null }
    });
    return { count };
  }

  async updateRead(platformUserId: string, id: string, dto: UpdatePlatformNotificationReadDto) {
    const existing = await this.prisma.platformNotification.findFirst({
      where: { id, platformUserId }
    });
    if (!existing) {
      throw new DomainException(
        ErrorCodes.NOTIFICATION_NOT_FOUND,
        "Notification not found",
        HttpStatus.NOT_FOUND
      );
    }

    const row = await this.prisma.platformNotification.update({
      where: { id },
      data: { readAt: dto.read ? new Date() : null }
    });
    return this.toDto(row);
  }

  async markAllRead(platformUserId: string, dto: MarkAllPlatformNotificationsReadDto) {
    const result = await this.prisma.platformNotification.updateMany({
      where: {
        platformUserId,
        readAt: null,
        ...(dto.unreadOnly === false ? {} : { readAt: null })
      },
      data: { readAt: new Date() }
    });
    return { updated: result.count };
  }

  async createInApp(input: {
    platformUserId: string;
    type: PlatformNotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }) {
    const row = await this.prisma.platformNotification.create({
      data: {
        platformUserId: input.platformUserId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
    const dto = this.toDto(row);
    const unreadCount = await this.prisma.platformNotification.count({
      where: { platformUserId: input.platformUserId, readAt: null }
    });
    void this.realtime
      .publishNotificationCreated(input.platformUserId, {
        notification: dto,
        unreadCount
      })
      .catch(() => undefined);
    return dto;
  }

  @Cron("0 3 * * *")
  async cleanOldNotifications() {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.platformNotification.deleteMany({
      where: { readAt: { not: null, lt: cutoff } }
    });
    this.logger.log(`Cleaned ${count} old platform notifications`);
  }
}
