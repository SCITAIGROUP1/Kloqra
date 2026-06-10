"use client";

import { cn } from "../../lib/utils.js";
import { Table, TableBody, TableCell, TableRow } from "../ui/table.js";
import { dataTableCellClass } from "./data-table.js";

export function TableLoadingRows({
  rows = 5,
  columns = 4,
  className
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <TableBody className={className}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="animate-pulse pointer-events-none">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <TableCell key={colIndex} className={dataTableCellClass}>
              <div
                className={cn(
                  "h-4 rounded-md bg-muted/70",
                  colIndex === columns - 1 ? "ml-auto w-16" : "w-full max-w-[180px]"
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export function TableLoadingState({
  rows = 5,
  columns = 4,
  className
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <Table>
        <TableLoadingRows rows={rows} columns={columns} />
      </Table>
    </div>
  );
}
