"use client";

import { DEFAULT_TABLE_PAGE_SIZE } from "@kloqra/contracts";
import type { TenantAnalyticsWorkspaceRowDto } from "@kloqra/contracts";
import {
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Button,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableToolbar
} from "@kloqra/ui";
import { useClientTablePagination, isClientCommercialFeaturesEnabled } from "@kloqra/web-shared";
import { useMemo, useState } from "react";
import {
  filterWorkspaceHoursRows,
  sortWorkspaceHoursRows,
  type WorkspaceHoursBillabilityFilter,
  type WorkspaceHoursSort
} from "./account-workspace-hours-filter";
import { formatDurationClock } from "@/components/report-charts";

type AccountWorkspaceHoursTableProps = {
  rows: TenantAnalyticsWorkspaceRowDto[];
  loading?: boolean;
  fallbackCurrency?: string;
  formatMoney: (amount: number, currency: string) => string;
};

export function AccountWorkspaceHoursTable({
  rows,
  loading = false,
  fallbackCurrency = "USD",
  formatMoney
}: AccountWorkspaceHoursTableProps) {
  const showAmount = isClientCommercialFeaturesEnabled();
  const [search, setSearch] = useState("");
  const [billabilityFilter, setBillabilityFilter] =
    useState<WorkspaceHoursBillabilityFilter>("ALL");
  const [sort, setSort] = useState<WorkspaceHoursSort>("hours-desc");
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const filteredRows = useMemo(
    () => sortWorkspaceHoursRows(filterWorkspaceHoursRows(rows, search, billabilityFilter), sort),
    [rows, search, billabilityFilter, sort]
  );

  const { page, setPage, pageItems, total, totalPages, limit } = useClientTablePagination(
    filteredRows,
    pageSize
  );

  function handlePageSizeChange(next: number) {
    setPageSize(next);
    setPage(1);
  }

  const hasSourceRows = rows.length > 0;
  const hasFilteredRows = filteredRows.length > 0;
  const activeWorkspaces = rows.filter((row) => row.totalHours > 0).length;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Hours by workspace</h2>
        <p className="text-sm text-muted-foreground">
          Read-only rollup for the selected period.
          {hasSourceRows ? (
            <span className="text-foreground/80">
              {" "}
              {activeWorkspaces} of {rows.length} workspaces logged time.
            </span>
          ) : null}
        </p>
      </div>

      <DataTableCard>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search workspaces…"
          searchAriaLabel="Search workspaces"
          filters={
            <>
              <Select
                value={billabilityFilter}
                onValueChange={(value) =>
                  setBillabilityFilter(value as WorkspaceHoursBillabilityFilter)
                }
              >
                <SelectTrigger className="h-9 w-[190px]" aria-label="Filter workspaces">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All workspaces</SelectItem>
                  <SelectItem value="with-hours">With time logged</SelectItem>
                  <SelectItem value="no-hours">No time logged</SelectItem>
                  <SelectItem value="billable">Billable only</SelectItem>
                  <SelectItem value="non-billable">Non-billable only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(value) => setSort(value as WorkspaceHoursSort)}>
                <SelectTrigger className="h-9 w-[190px]" aria-label="Sort workspaces">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours-desc">Hours (high to low)</SelectItem>
                  <SelectItem value="hours-asc">Hours (low to high)</SelectItem>
                  <SelectItem value="amount-desc">Amount (high to low)</SelectItem>
                  <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />

        {loading ? (
          <div className="p-4">
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : !hasSourceRows ? (
          <p className="p-6 text-sm text-muted-foreground">No time logged in this period.</p>
        ) : !hasFilteredRows ? (
          <div className="p-6">
            <EmptyState
              title="No workspaces match your filters"
              description="Try a different search term or clear the billability filter."
              action={
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => {
                    setSearch("");
                    setBillabilityFilter("ALL");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Workspace</DataTableHead>
                  <DataTableHead className="text-right">Hours</DataTableHead>
                  <DataTableHead className="text-right">Billable %</DataTableHead>
                  {showAmount ? <DataTableHead className="text-right">Amount</DataTableHead> : null}
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((row) => (
                  <TableRow key={row.workspaceId}>
                    <DataTableCell className="font-medium">{row.workspaceName}</DataTableCell>
                    <DataTableCell className="text-right tabular-nums">
                      {formatDurationClock(row.totalHours)}
                    </DataTableCell>
                    <DataTableCell className="text-right tabular-nums">
                      {row.totalHours > 0 ? `${row.billablePercent.toFixed(0)}%` : "—"}
                    </DataTableCell>
                    {showAmount ? (
                      <DataTableCell className="text-right tabular-nums">
                        {formatMoney(row.billableAmount, row.currency ?? fallbackCurrency)}
                      </DataTableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={handlePageSizeChange}
              pageUnit="workspaces"
            />
          </>
        )}
      </DataTableCard>
    </div>
  );
}
