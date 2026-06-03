import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import {
  createReportShareSchema,
  exportPreviewBodySchema,
  type CreateReportShareDto,
  type PublicReportShareViewDto,
  type ReportShareDto
} from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { ExportRowsBuilder } from "./export-rows.builder";
import { ExportService } from "./export.service";

@Injectable()
export class ReportShareService {
  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
    private rowsBuilder: ExportRowsBuilder
  ) {}

  async create(
    workspaceId: string,
    dto: CreateReportShareDto,
    adminPublicBaseUrl: string
  ): Promise<ReportShareDto> {
    const parsed = createReportShareSchema.parse(dto);
    exportPreviewBodySchema.parse(parsed.body);

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + parsed.expiresInDays);

    const token = randomBytes(24).toString("hex");
    const row = await this.prisma.reportShare.create({
      data: {
        workspaceId,
        token,
        body: parsed.body,
        expiresAt
      }
    });

    const base = adminPublicBaseUrl.replace(/\/$/, "");
    return {
      id: row.id,
      token: row.token,
      expiresAt: row.expiresAt.toISOString(),
      shareUrl: `${base}/share/${row.token}`
    };
  }

  async getPublicView(token: string): Promise<PublicReportShareViewDto> {
    const share = await this.prisma.reportShare.findUnique({
      where: { token },
      include: { workspace: true }
    });

    if (!share || share.expiresAt < new Date()) {
      throw new NotFoundException("Share link not found or expired");
    }

    const body = exportPreviewBodySchema.parse(share.body);
    const ctx = await this.exportService.loadContext(share.workspaceId, body);

    const reports = [];
    for (const reportType of body.reportTypes) {
      const rows = await this.rowsBuilder.buildRows(reportType, ctx);
      reports.push({ reportType, rows: rows.slice(0, 100) });
    }

    return {
      workspaceName: share.workspace.name,
      period: { from: body.from.slice(0, 10), to: body.to.slice(0, 10) },
      billable: body.billable,
      generatedAt: new Date().toISOString(),
      reports
    };
  }
}
