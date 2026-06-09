import { PassThrough } from "stream";
import {
  buildExportFilename,
  EXPORT_COLUMN_LABELS,
  MEMBER_EXPORT_COLUMN_LABELS,
  parseWorkspaceSettings,
  resolveExportColumns,
  resolveMemberExportColumns,
  type ExportBodyDto,
  type ExportFiltersDto,
  type ExportPreviewBodyDto,
  type ExportPreviewResponseDto,
  type ExportReportType,
  type MemberExportBodyDto,
  type MemberExportReportType
} from "@chronomint/contracts";
import { Injectable } from "@nestjs/common";
import archiver from "archiver";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { roundExport } from "../../../common/time/round.util";
import { TimeAggregationService } from "../../../common/time/time-aggregation.service";
import { buildExportPreviewCopy } from "./export-preview-copy.util";
import { projectRows, rowsToCsv } from "./export-render.util";
import { ExportRowsBuilder, type ExportRowContext } from "./export-rows.builder";
import {
  allocateSheetName,
  groupRowsByField,
  innerGroupByForSplit,
  previewSheetKind,
  splitFieldForLayout
} from "./export-sheet.util";
import { sortRowsForGroupBy } from "./export-sort.util";

type SheetData = {
  name: string;
  report: ExportReportType | MemberExportReportType;
  reportSlug: string;
  headers: string[];
  lines: string[][];
};

type ExportScope = "admin" | "member";

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService,
    private rowsBuilder: ExportRowsBuilder
  ) {}

  async generate(
    workspaceId: string,
    body: ExportBodyDto
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    return this.runExport(workspaceId, body, "admin");
  }

  async generateMember(
    workspaceId: string,
    userId: string,
    body: MemberExportBodyDto
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    return this.runExport(
      workspaceId,
      {
        from: body.from,
        to: body.to,
        projectId: body.projectId,
        categoryId: body.categoryId,
        taskId: body.taskId,
        userId,
        billable: body.billable,
        groupBy: [],
        sheetLayout: "standard",
        reportTypes: body.reportTypes as ExportReportType[],
        format: body.format,
        columns: body.columns as ExportBodyDto["columns"]
      },
      "member",
      body
    );
  }

  async generateLegacy(
    workspaceId: string,
    query: {
      from: string;
      to: string;
      projectId?: string;
      userId?: string;
      format: "csv" | "pdf" | "xlsx";
    }
  ) {
    return this.generate(workspaceId, {
      from: query.from,
      to: query.to,
      projectId: query.projectId,
      userId: query.userId,
      billable: "all",
      groupBy: [],
      sheetLayout: "standard",
      reportTypes: ["time_entries"],
      format: query.format === "pdf" ? "pdf" : query.format === "xlsx" ? "xlsx" : "csv"
    });
  }

  async preview(
    workspaceId: string,
    body: ExportPreviewBodyDto
  ): Promise<ExportPreviewResponseDto> {
    const ctx = await this.loadContext(workspaceId, body);
    const counts = {} as Record<ExportReportType, number>;
    const sheetPlan = await this.buildSheets(
      workspaceId,
      { ...body, format: "xlsx" },
      "admin",
      undefined,
      ctx
    );

    for (const report of body.reportTypes) {
      const rows = await this.rowsBuilder.buildRows(report, ctx);
      counts[report] = rows.length;
    }

    const isEmpty = ctx.logs.length === 0;
    const layout = body.sheetLayout ?? "standard";
    const sheets = sheetPlan.map((s) => {
      const split = splitFieldForLayout(layout, s.report as ExportReportType);
      return {
        name: s.name,
        rowCount: s.lines.length,
        kind: previewSheetKind(layout, split)
      };
    });
    const { headline, detail } = buildExportPreviewCopy(body, sheets, ctx.logs.length);

    return {
      counts,
      totalLogRows: ctx.logs.length,
      isEmpty,
      sheets,
      headline,
      detail
    };
  }

  async loadContext(workspaceId: string, filters: ExportFiltersDto): Promise<ExportRowContext> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });

    const from = new Date(filters.from);
    const to = new Date(filters.to);

    let userIds: string[] | undefined;
    if (filters.teamOnly && filters.projectId) {
      userIds = await this.aggregation.teamMemberUserIds(filters.projectId);
    }

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      projectId: filters.projectId,
      userId: filters.userId,
      userIds,
      categoryId: filters.categoryId,
      taskId: filters.taskId,
      billable: filters.billable
    });

    const { resolveRate } = await this.aggregation.resolveRateMaps(workspaceId);
    const aggregates = this.aggregation.buildAggregates(logs, resolveRate);

    return {
      workspaceId,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      settings: parseWorkspaceSettings(workspace.settings),
      filters,
      from,
      to,
      logs,
      aggregates,
      resolveRate
    };
  }

  private async runExport(
    workspaceId: string,
    body: ExportBodyDto,
    scope: ExportScope,
    memberBody?: MemberExportBodyDto
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const ctx = await this.loadContext(workspaceId, body);
    const settings = ctx.settings;
    const sheets = await this.buildSheets(workspaceId, body, scope, memberBody, ctx);

    const fileBase = {
      workspaceSlug: ctx.workspaceSlug,
      from: body.from,
      to: body.to,
      scope
    } as const;

    if (body.format === "csv") {
      return this.renderCsv(sheets, fileBase);
    }
    if (body.format === "xlsx") {
      return this.renderXlsx(sheets, fileBase);
    }
    return this.renderPdf(sheets, fileBase, body, ctx.workspaceName, settings);
  }

  private async buildSheets(
    _workspaceId: string,
    body: ExportBodyDto,
    scope: ExportScope,
    memberBody: MemberExportBodyDto | undefined,
    ctx: ExportRowContext
  ): Promise<SheetData[]> {
    const isMember = scope === "member";
    const layout = body.sheetLayout ?? "standard";
    const sheets: SheetData[] = [];
    const usedNames = new Set<string>();

    for (const report of body.reportTypes) {
      const columnKeys = isMember
        ? resolveMemberExportColumns(report as MemberExportReportType, memberBody?.columns)
        : resolveExportColumns(report, body.columns);

      const labels = isMember
        ? MEMBER_EXPORT_COLUMN_LABELS[report as MemberExportReportType]
        : EXPORT_COLUMN_LABELS[report];

      const rows: Record<string, string | number>[] = isMember
        ? this.buildMemberRows(
            report as MemberExportReportType,
            ctx.logs,
            ctx.aggregates,
            ctx.resolveRate
          )
        : await this.rowsBuilder.buildRows(report, ctx);

      const splitField = isMember ? null : splitFieldForLayout(layout, report);

      if (splitField) {
        const innerGroupBy = innerGroupByForSplit(body.groupBy ?? [], splitField);
        for (const [groupName, groupRows] of groupRowsByField(
          sortRowsForGroupBy(rows, report, innerGroupBy),
          splitField
        )) {
          const { headers, lines } = projectRows(groupRows, columnKeys, labels);
          const name = allocateSheetName(groupName, usedNames);
          sheets.push({
            name,
            report,
            reportSlug: `${this.fileSlug(report)}-${name.toLowerCase().replace(/\s+/g, "-")}`,
            headers,
            lines
          });
        }
        continue;
      }

      const { headers, lines } = projectRows(rows, columnKeys, labels);
      const name = allocateSheetName(this.sheetName(report), usedNames);
      sheets.push({
        name,
        report,
        reportSlug: this.fileSlug(report),
        headers,
        lines
      });
    }

    return sheets;
  }

  private buildMemberRows(
    report: MemberExportReportType,
    logs: ExportRowContext["logs"],
    aggregates: ExportRowContext["aggregates"],
    resolveRate: ExportRowContext["resolveRate"]
  ): Record<string, string | number>[] {
    if (report === "time_entries") {
      return logs.map((l) => {
        const hours = l.durationSec / 3600;
        const rate = resolveRate(
          l.userId,
          l.task.projectId,
          l.user.defaultHourlyRate?.toNumber() ?? null
        );
        const amount = l.isBillable ? hours * rate : 0;
        const categoryName = l.task.category?.name ?? "Uncategorized";
        return {
          project: l.task.project.name,
          category: categoryName,
          task: l.task.taskName,
          date: l.startTime.toISOString().slice(0, 10),
          start_time: l.startTime.toISOString(),
          end_time: l.endTime.toISOString(),
          hours: roundExport(hours),
          billable: l.isBillable ? "yes" : "no",
          rate: roundExport(rate),
          amount: roundExport(amount),
          description: l.description ?? "",
          source: l.source
        };
      });
    }

    if (report === "daily_summary") {
      const rows: Record<string, string | number>[] = [];
      for (const [date, dayMap] of aggregates.daily) {
        for (const [, v] of dayMap) {
          rows.push({
            date,
            project: v.projectName,
            total_hours: roundExport(v.totalHours),
            billable_hours: roundExport(v.billableHours),
            non_billable_hours: roundExport(v.totalHours - v.billableHours)
          });
        }
      }
      return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }

    if (report === "by_category") {
      return [...aggregates.byCategory.entries()]
        .map(([, v]) => ({
          category: v.categoryName,
          total_hours: roundExport(v.totalHours),
          billable_hours: roundExport(v.billableHours),
          non_billable_hours: roundExport(v.totalHours - v.billableHours)
        }))
        .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
    }

    return [...aggregates.byProject.entries()]
      .map(([, v]) => ({
        project: v.projectName,
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours)
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private sheetName(report: ExportReportType | MemberExportReportType): string {
    const names: Record<string, string> = {
      time_entries: "Time entries",
      invoice: "Invoice",
      daily_summary: "Daily summary",
      weekly_summary: "Weekly summary",
      by_project: "By project",
      by_member: "By member",
      by_client: "By client",
      by_task: "By task",
      by_category: "By category",
      users_without_time: "Users without time",
      budget_vs_actual: "Budget vs actual",
      utilization: "Utilization"
    };
    return (names[report] ?? report).slice(0, 31);
  }

  private fileSlug(report: ExportReportType | MemberExportReportType): string {
    const slugs: Record<string, string> = {
      time_entries: "time-entries",
      invoice: "invoice",
      daily_summary: "daily-summary",
      weekly_summary: "weekly-summary",
      by_project: "by-project",
      by_member: "by-member",
      by_client: "by-client",
      by_task: "by-task",
      by_category: "by-category",
      users_without_time: "users-without-time",
      budget_vs_actual: "budget-vs-actual",
      utilization: "utilization"
    };
    return slugs[report] ?? "report";
  }

  private async renderCsv(
    sheets: SheetData[],
    fileBase: { workspaceSlug: string; from: string; to: string; scope: ExportScope }
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    if (sheets.length === 1) {
      const s = sheets[0]!;
      const csv = rowsToCsv(s.headers, s.lines);
      return {
        buffer: Buffer.from(csv, "utf-8"),
        contentType: "text/csv",
        filename: buildExportFilename({
          ...fileBase,
          reportSlug: s.reportSlug,
          ext: "csv"
        })
      };
    }

    const buffer = await this.zipCsvFiles(sheets, fileBase);
    return {
      buffer,
      contentType: "application/zip",
      filename: buildExportFilename({ ...fileBase, ext: "zip" })
    };
  }

  private zipCsvFiles(
    sheets: SheetData[],
    fileBase: { workspaceSlug: string; from: string; to: string; scope: ExportScope }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver("zip", { zlib: { level: 9 } });
      const stream = new PassThrough();
      const chunks: Buffer[] = [];
      stream.on("data", (c) => chunks.push(c as Buffer));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
      archive.on("error", reject);
      archive.pipe(stream);

      for (const s of sheets) {
        const csv = rowsToCsv(s.headers, s.lines);
        const name = buildExportFilename({
          ...fileBase,
          reportSlug: s.reportSlug,
          ext: "csv"
        });
        archive.append(csv, { name });
      }
      archive.finalize();
    });
  }

  private async renderXlsx(
    sheets: SheetData[],
    fileBase: { workspaceSlug: string; from: string; to: string; scope: ExportScope }
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    for (const s of sheets) {
      const ws = workbook.addWorksheet(s.name);
      ws.addRow(s.headers);
      for (const line of s.lines) {
        ws.addRow(line);
      }
      ws.getRow(1).font = { bold: true };
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: buildExportFilename({ ...fileBase, ext: "xlsx" })
    };
  }

  private async renderPdf(
    sheets: SheetData[],
    fileBase: { workspaceSlug: string; from: string; to: string; scope: ExportScope },
    body: ExportBodyDto,
    workspaceName: string,
    settings: ReturnType<typeof parseWorkspaceSettings>
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    const title = fileBase.scope === "member" ? "ChronoMint — My timesheet" : "ChronoMint Export";
    doc.fontSize(18).text(title, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).text(workspaceName, { align: "center" });
    doc.fontSize(10).text(`Period: ${body.from.slice(0, 10)} — ${body.to.slice(0, 10)}`);
    doc.text(`Billable filter: ${body.billable}`);
    doc.moveDown();

    for (const s of sheets) {
      doc.fontSize(14).text(s.name);
      doc.moveDown(0.3);
      doc.fontSize(8);

      const maxRows = s.report === "time_entries" || s.report === "invoice" ? 500 : 200;
      const slice = s.lines.slice(0, maxRows);
      for (const line of slice) {
        doc.text(line.join(" | "));
      }
      if (s.lines.length > maxRows) {
        doc.moveDown(0.3);
        doc.text(`… ${s.lines.length - maxRows} more rows (use Excel/CSV for full export)`);
      }
      doc.moveDown();
    }

    if (settings.exportFooterNote) {
      doc.fontSize(8).fillColor("#555555").text(settings.exportFooterNote, { align: "center" });
    }

    doc.end();
    await new Promise<void>((resolve) => doc.on("end", resolve));

    return {
      buffer: Buffer.concat(chunks),
      contentType: "application/pdf",
      filename: buildExportFilename({ ...fileBase, ext: "pdf" })
    };
  }
}
