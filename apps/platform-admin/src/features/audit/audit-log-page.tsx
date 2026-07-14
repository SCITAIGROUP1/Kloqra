"use client";

import {
  DEFAULT_TABLE_PAGE_SIZE,
  type PlatformAuditAction,
  type PlatformAuditEventDto
} from "@kloqra/contracts";
import {
  AppBar,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableRow
} from "@kloqra/ui";
import { usePlatformAuditEvents } from "@kloqra/web-shared";
import Link from "next/link";
import { useMemo, useState } from "react";

const ACTION_OPTIONS: Array<{ value: PlatformAuditAction | ""; label: string }> = [
  { value: "", label: "All actions" },
  { value: "platform.login", label: "Login" },
  { value: "platform.tenant.created", label: "Tenant created" },
  { value: "platform.tenant.updated", label: "Tenant updated" },
  { value: "platform.tenant.suspended", label: "Tenant suspended" },
  { value: "platform.tenant.churned", label: "Tenant churned" },
  { value: "platform.tenant.trial_extended", label: "Trial extended" }
];

function formatSummary(summary: PlatformAuditEventDto["summary"]): string {
  try {
    return JSON.stringify(summary);
  } catch {
    return String(summary);
  }
}

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<PlatformAuditAction | "">("");
  const [tenantId, setTenantId] = useState("");

  const query = useMemo(
    () => ({
      page,
      limit: DEFAULT_TABLE_PAGE_SIZE,
      ...(action ? { action } : {}),
      ...(tenantId.trim() ? { tenantId: tenantId.trim() } : {})
    }),
    [action, page, tenantId]
  );

  const { data, loading, error } = usePlatformAuditEvents(query);

  return (
    <div className="space-y-6">
      <AppBar title="Audit log" description="Immutable record of platform staff actions." />

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Action</span>
          <select
            className="flex h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
            value={action}
            onChange={(event) => {
              setPage(1);
              setAction(event.target.value as PlatformAuditAction | "");
            }}
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Tenant ID</span>
          <input
            className="flex h-9 w-72 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Filter by tenant UUID"
            value={tenantId}
            onChange={(event) => {
              setPage(1);
              setTenantId(event.target.value);
            }}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading audit events…</p> : null}

      <DataTableCard>
        <Table>
          <TableBody>
            <DataTableHeaderRow>
              <DataTableHead>Time</DataTableHead>
              <DataTableHead>Actor</DataTableHead>
              <DataTableHead>Action</DataTableHead>
              <DataTableHead>Tenant</DataTableHead>
              <DataTableHead>Summary</DataTableHead>
            </DataTableHeaderRow>
            {(data?.items ?? []).map((event) => (
              <TableRow key={event.id}>
                <DataTableCell className="whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleString()}
                </DataTableCell>
                <DataTableCell>
                  <div className="font-medium">{event.actorName}</div>
                  <div className="text-xs text-muted-foreground">{event.actorEmail}</div>
                </DataTableCell>
                <DataTableCell className="font-mono text-xs">{event.action}</DataTableCell>
                <DataTableCell>
                  {event.tenantId ? (
                    <Link
                      href={`/tenants/${event.tenantId}`}
                      className="text-primary hover:underline"
                    >
                      {event.tenantId.slice(0, 8)}…
                    </Link>
                  ) : (
                    "—"
                  )}
                </DataTableCell>
                <DataTableCell className="max-w-md truncate text-xs text-muted-foreground">
                  {formatSummary(event.summary)}
                </DataTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} events)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              disabled={page >= data.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
