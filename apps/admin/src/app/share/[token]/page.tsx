"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { ROUTES, type PublicReportShareViewDto } from "@chronomint/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

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
    fetch(`${API_BASE}${ROUTES.EXPORT.SHARE(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(body.message ?? `Link unavailable (${res.status})`);
        }
        return res.json() as Promise<PublicReportShareViewDto>;
      })
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "This share link is invalid or has expired.")
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <p className="text-muted-foreground">Loading shared report…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Report unavailable</CardTitle>
            <CardDescription>{error ?? "Unknown error"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Shared report · read-only</p>
          <h1 className="text-2xl font-semibold">{data.workspaceName}</h1>
          <p className="text-sm text-muted-foreground">
            {data.period.from} – {data.period.to} · Billable filter: {data.billable}
          </p>
        </div>

        {data.reports.map((report) => {
          const cols =
            report.rows.length > 0 ? Object.keys(report.rows[0]!) : [];
          return (
            <Card key={report.reportType}>
              <CardHeader>
                <CardTitle className="text-base">
                  {REPORT_LABELS[report.reportType] ?? report.reportType}
                </CardTitle>
                <CardDescription>
                  Showing up to {report.rows.length} rows (preview limit)
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {report.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rows in this report.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {cols.map((c) => (
                          <TableHead key={c} className="whitespace-nowrap capitalize">
                            {c.replace(/_/g, " ")}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.rows.map((row, i) => (
                        <TableRow key={i}>
                          {cols.map((c) => (
                            <TableCell key={c} className="tabular-nums text-sm">
                              {String(row[c] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
