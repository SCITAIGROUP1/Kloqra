import { randomBytes } from "crypto";
import {
  createWidgetShareSchema,
  ErrorCodes,
  MAX_LIST_LIMIT,
  WIDGET_SHARE_LABELS,
  widgetShareBodySchema,
  widgetShareStoredBodySchema,
  type CreateWidgetShareDto,
  type PublicWidgetShareViewDto,
  type WidgetShareDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { ReportingService } from "./reporting.service";

@Injectable()
export class WidgetShareService {
  constructor(
    private prisma: PrismaService,
    private reporting: ReportingService
  ) {}

  async create(
    workspaceId: string,
    dto: CreateWidgetShareDto,
    adminPublicBaseUrl: string
  ): Promise<WidgetShareDto> {
    const parsed = createWidgetShareSchema.parse(dto);
    widgetShareBodySchema.parse(parsed.body);

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + parsed.expiresInDays);

    const token = randomBytes(24).toString("hex");
    const row = await this.prisma.widgetShare.create({
      data: {
        workspaceId,
        token,
        body: parsed.body as Prisma.InputJsonValue,
        expiresAt
      }
    });

    const base = adminPublicBaseUrl.replace(/\/$/, "");
    return {
      id: row.id,
      token: row.token,
      expiresAt: row.expiresAt.toISOString(),
      shareUrl: `${base}/widget/${row.token}`
    };
  }

  async getPublicView(token: string): Promise<PublicWidgetShareViewDto> {
    const share = await this.prisma.widgetShare.findUnique({
      where: { token },
      include: { workspace: true }
    });

    if (!share || share.expiresAt < new Date()) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Share link not found or expired",
        HttpStatus.NOT_FOUND
      );
    }

    const body = widgetShareStoredBodySchema.parse(share.body);
    const widgetLabel = WIDGET_SHARE_LABELS[body.widgetId];

    if (body.widgetId === "team_utilization") {
      const utilization = await this.reporting.utilization(share.workspaceId, {
        from: body.from,
        to: body.to,
        projectId: body.projectId,
        userId: body.userId,
        categoryId: body.categoryId,
        taskId: body.taskId,
        page: 1,
        limit: MAX_LIST_LIMIT
      });

      return {
        workspaceName: share.workspace.name,
        widgetId: body.widgetId,
        widgetLabel,
        period: {
          from: body.from.slice(0, 10),
          to: body.to.slice(0, 10)
        },
        generatedAt: new Date().toISOString(),
        options: body.options,
        payload: utilization
      };
    }

    const report = await this.reporting.dashboard(share.workspaceId, {
      from: body.from,
      to: body.to,
      projectId: body.projectId,
      userId: body.userId,
      categoryId: body.categoryId,
      taskId: body.taskId
    });

    return {
      workspaceName: share.workspace.name,
      widgetId: body.widgetId,
      widgetLabel,
      period: {
        from: body.from.slice(0, 10),
        to: body.to.slice(0, 10)
      },
      generatedAt: new Date().toISOString(),
      options: body.options,
      payload: report
    };
  }
}
