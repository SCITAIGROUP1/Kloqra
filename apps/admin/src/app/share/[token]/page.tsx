"use client";

import { ROUTES, type PublicReportShareViewDto } from "@kloqra/contracts";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow
} from "@kloqra/ui";
import { useClientTablePagination } from "@kloqra/web-shared";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { publicFetch } from "@/lib/api";

const REPORT_LABELS: Record<string, string> = {
  time_entries: "Time entries",
  daily_summary: "Daily summary",
  weekly_summary: "Weekly summary",
  by_project: "By project",
  by_member: "By member",
  by_task: "By task",
  invoice: "Invoice",
  users_without_time: "Users without time",
  budget_vs_actual: "Budget vs actual",
  utilization: "Utilization"
};

const SHARE_TABLE_PAGE_SIZE = 15;

function SharedReportTable({
  reportType,
  rows
}: {
  reportType: string;
  rows: Record<string, unknown>[];
}) {
  const cols = rows.length > 0 ? Object.keys(rows[0]!) : [];
  const { page, setPage, pageItems, total, totalPages, limit } = useClientTablePagination(
    rows,
    SHARE_TABLE_PAGE_SIZE
  );

  if (rows.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No rows in this report.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <DataTableHeaderRow>
            {cols.map((c) => (
              <DataTableHead key={c} className="whitespace-nowrap capitalize">
                {c.replace(/_/g, " ")}
              </DataTableHead>
            ))}
          </DataTableHeaderRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((row, i) => (
            <TableRow key={`${reportType}-${page}-${i}`}>
              {cols.map((c) => (
                <DataTableCell key={c} className="tabular-nums text-sm">
                  {String(row[c] ?? "")}
                </DataTableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      ) : null}
    </>
  );
}

export default function PublicSharePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [data, setData] = useState<PublicReportShareViewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Invalid share link.");
      setLoading(false);
      return;
    }
    publicFetch<PublicReportShareViewDto>(ROUTES.EXPORT.SHARE(token))
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "This share link is invalid or has expired.")
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <p className="text-muted-foreground">Loading shared report…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Report unavailable</CardTitle>
            <CardDescription>{error ?? "Unknown error"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-sm text-muted-foreground">Shared report · read-only</p>
          <h1 className="text-2xl font-semibold">{data.workspaceName}</h1>
          <p className="text-sm text-muted-foreground">
            {data.period.from} – {data.period.to} · Billable filter: {data.billable}
          </p>
        </div>

        {data.reports.map((report) => (
          <DataTableCard key={report.reportType}>
            <div className="border-b border-border/60 px-6 py-4">
              <h2 className="text-base font-semibold">
                {REPORT_LABELS[report.reportType] ?? report.reportType}
              </h2>
              <p className="text-sm text-muted-foreground">{report.rows.length} rows total</p>
            </div>
            <div className="overflow-x-auto">
              <SharedReportTable reportType={report.reportType} rows={report.rows} />
            </div>
          </DataTableCard>
        ))}
      </div>
    </div>
  );
}
