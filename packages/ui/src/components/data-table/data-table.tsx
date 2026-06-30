"use client";

import { TABLE_PAGE_SIZE_OPTIONS } from "@kloqra/contracts";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils.js";
import { Button } from "../ui/button.js";
import { Card } from "../ui/card.js";
import { Input } from "../ui/input.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.js";

export const dataTableCardClass = "gap-0 overflow-hidden border-primary/10 p-0 shadow-sm";
export const dataTableHeaderRowClass = "border-b border-border/60 bg-muted/30 hover:bg-muted/30";
export const dataTableHeadClass =
  "h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
export const dataTableCellClass = "px-4 py-3 text-sm";

export function DataTableCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Card className={cn(dataTableCardClass, className)}>{children}</Card>;
}

export type TableToolbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
};

export function TableToolbar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  searchAriaLabel = "Search table",
  filters,
  actions
}: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {onSearchChange ? (
          <div className="relative min-w-[220px] max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9"
              aria-label={searchAriaLabel}
            />
          </div>
        ) : null}
        {filters}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type TablePaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
  pageUnit?: string;
  pageSizeLabel?: string;
  summary?: React.ReactNode;
  disabled?: boolean;
};

export function TablePagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
  pageUnit = "Page",
  pageSizeLabel = "Rows per page",
  summary,
  disabled
}: TablePaginationProps) {
  const sizes = pageSizeOptions ?? TABLE_PAGE_SIZE_OPTIONS ?? [10, 25, 50];
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(page * limit, total);
  const defaultSummary = `Showing ${start}–${end} of ${total}`;

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span>{summary ?? defaultSummary}</span>
      <div className="flex flex-wrap items-center gap-2">
        {onLimitChange ? (
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">{pageSizeLabel}</span>
            <Select
              value={String(limit)}
              onValueChange={(value) => onLimitChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[72px]" aria-label={pageSizeLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" />
          Previous
        </Button>
        <span className="min-w-[80px] text-center font-medium text-foreground">
          {pageUnit} {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          disabled={disabled || page >= totalPages || totalPages === 0}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function DataTableHeaderRow({ className, ...props }: React.ComponentProps<typeof TableRow>) {
  return <TableRow className={cn(dataTableHeaderRowClass, className)} {...props} />;
}

export function DataTableHead({ className, ...props }: React.ComponentProps<typeof TableHead>) {
  return <TableHead className={cn(dataTableHeadClass, className)} {...props} />;
}

export function DataTableCell({ className, ...props }: React.ComponentProps<typeof TableCell>) {
  return <TableCell className={cn(dataTableCellClass, className)} {...props} />;
}

export { Table, TableBody, TableHeader, TableRow };
