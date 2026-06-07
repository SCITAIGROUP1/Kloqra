import { ErrorCodes } from "@chronomint/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TimeAggregationService } from "../../../common/time/time-aggregation.service";

interface GenerateInvoiceDto {
  projectId: string;
  from: string;
  to: string;
  invoiceNumber: string;
  dueDate: string;
  companyName: string;
  clientName: string;
}

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService
  ) {}

  async generate(
    workspaceId: string,
    dto: GenerateInvoiceDto
  ): Promise<{ buffer: Buffer; filename: string }> {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, workspaceId }
    });

    if (!project) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Project not found in this workspace",
        HttpStatus.NOT_FOUND
      );
    }

    const fromDate = new Date(dto.from);
    const toDate = new Date(dto.to);

    // Fetch all logs for this project in the date range
    const logs = await this.aggregation.fetchLogs(workspaceId, {
      projectId: dto.projectId,
      from: fromDate,
      to: toDate,
      billable: "billable"
    });

    if (logs.length === 0) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No billable time entries found for this project in the selected range",
        HttpStatus.BAD_REQUEST
      );
    }

    // Resolve rates
    const { resolveRate } = await this.aggregation.resolveRateMaps(workspaceId);

    // Group logs by task and user to build line items
    const lineItemsMap = new Map<
      string,
      { taskName: string; userName: string; hours: number; rate: number }
    >();

    for (const log of logs) {
      const rate = resolveRate(
        log.userId,
        dto.projectId,
        log.user.defaultHourlyRate?.toNumber() ?? null
      );
      const key = `${log.taskId}-${log.userId}-${rate}`;
      const hours = log.durationSec / 3600;

      const existing = lineItemsMap.get(key);
      if (existing) {
        existing.hours += hours;
      } else {
        lineItemsMap.set(key, {
          taskName: log.task.taskName,
          userName: log.user.name,
          hours,
          rate
        });
      }
    }

    const lineItems = [...lineItemsMap.values()].map((item) => {
      const roundedHours = Math.round(item.hours * 100) / 100;
      const subtotal = Math.round(roundedHours * item.rate * 100) / 100;
      return {
        description: `${item.taskName} - ${item.userName}`,
        hours: roundedHours,
        rate: item.rate,
        subtotal
      };
    });

    const totalAmount = lineItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const promise = new Promise<Buffer>((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Design layout

    // Primary Colors
    const primaryColor = "#0f172a"; // slate-900
    const secondaryColor = "#475569"; // slate-600
    const accentColor = "#0284c7"; // sky-600
    const borderColor = "#e2e8f0"; // slate-200

    // Header Title
    doc.fillColor(primaryColor).fontSize(28).text("INVOICE", 50, 50, { align: "right" });
    doc
      .fillColor(accentColor)
      .fontSize(10)
      .text(`Invoice #: ${dto.invoiceNumber}`, { align: "right" });

    // Logo / Brand
    doc.fillColor(primaryColor).fontSize(16).text(dto.companyName, 50, 50, { align: "left" });
    doc.fillColor(secondaryColor).fontSize(9).text("Time Tracking & Billing Export", 50, 68);

    doc.moveDown(3);

    // Bill to / Info
    const currentY = doc.y;
    doc.fillColor(secondaryColor).fontSize(10).text("BILL TO:", 50, currentY);
    doc
      .fillColor(primaryColor)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(dto.clientName, 50, currentY + 14)
      .font("Helvetica");
    doc
      .fillColor(secondaryColor)
      .fontSize(9)
      .text(`Project: ${project.name}`, 50, currentY + 30);

    doc.fillColor(secondaryColor).fontSize(10).text("INVOICE DETAILS:", 350, currentY);
    doc
      .fillColor(primaryColor)
      .fontSize(9)
      .text(`Issue Date: ${new Date().toLocaleDateString()}`, 350, currentY + 14)
      .text(`Due Date: ${new Date(dto.dueDate).toLocaleDateString()}`, 350, currentY + 26)
      .text(
        `Project Period: ${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`,
        350,
        currentY + 38
      );

    doc.moveDown(3);

    // Table Header
    const tableHeaderY = doc.y;
    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(10);
    doc.text("Description", 50, tableHeaderY);
    doc.text("Hours", 320, tableHeaderY, { width: 60, align: "right" });
    doc.text("Rate", 390, tableHeaderY, { width: 60, align: "right" });
    doc.text("Line Total", 460, tableHeaderY, { width: 80, align: "right" });

    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(50, tableHeaderY + 15)
      .lineTo(540, tableHeaderY + 15)
      .stroke();

    doc.font("Helvetica").fontSize(9).fillColor(primaryColor);
    let rowY = tableHeaderY + 25;

    // Draw rows
    for (const item of lineItems) {
      // Check if page needs break
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }

      doc.text(item.description, 50, rowY, { width: 260 });
      doc.text(item.hours.toFixed(2), 320, rowY, { width: 60, align: "right" });
      doc.text(`$${item.rate.toFixed(2)}`, 390, rowY, { width: 60, align: "right" });
      doc.text(`$${item.subtotal.toFixed(2)}`, 460, rowY, { width: 80, align: "right" });

      rowY += 20;
      doc
        .strokeColor(borderColor)
        .lineWidth(0.5)
        .moveTo(50, rowY - 5)
        .lineTo(540, rowY - 5)
        .stroke();
    }

    // Totals section
    if (rowY > 650) {
      doc.addPage();
      rowY = 50;
    }

    rowY += 10;
    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Total Due:", 350, rowY);
    doc
      .fillColor(accentColor)
      .fontSize(14)
      .text(`$${totalAmount.toFixed(2)}`, 450, rowY, { align: "right" });

    doc
      .strokeColor(accentColor)
      .lineWidth(2)
      .moveTo(350, rowY + 18)
      .lineTo(540, rowY + 18)
      .stroke();

    // Footer
    doc
      .fillColor(secondaryColor)
      .fontSize(8)
      .text("Thank you for your business!", 50, 750, { align: "center" });

    doc.end();

    const buffer = await promise;
    const cleanProjectName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `invoice-${cleanProjectName}-${dto.invoiceNumber}.pdf`;

    return { buffer, filename };
  }
}
