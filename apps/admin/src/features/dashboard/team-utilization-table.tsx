"use client";

import type { UtilizationMemberDto, UtilizationResponseDto } from "@kloqra/contracts";
import {
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow
} from "@kloqra/ui";

function UtilizationRow({ member }: { member: UtilizationMemberDto }) {
  return (
    <TableRow className="hover:bg-muted/30">
      <DataTableCell className="px-3 py-2 text-xs font-medium">{member.userName}</DataTableCell>
      <DataTableCell className="px-3 py-2 text-right font-mono text-xs">
        {member.loggedHours.toFixed(1)}h
      </DataTableCell>
      <DataTableCell className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
        {member.billableHours.toFixed(1)}h
      </DataTableCell>
      <DataTableCell className="px-3 py-2 text-right font-mono text-xs font-bold">
        {member.utilizationPct}%
      </DataTableCell>
    </TableRow>
  );
}

export function TeamUtilizationTargetBadge({ data }: { data: UtilizationResponseDto }) {
  return (
    <span className="rounded-full border bg-muted px-2 py-0.5 text-[10px] font-medium">
      Target: {data.targetHours.toFixed(1)} hrs ({data.expectedWeeklyHours}h/wk)
    </span>
  );
}

export function TeamUtilizationTable({
  data,
  page,
  onPageChange,
  showPagination = true
}: {
  data: UtilizationResponseDto;
  page?: number;
  onPageChange?: (page: number) => void;
  showPagination?: boolean;
}) {
  if (data.members.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">No team members found.</p>;
  }

  return (
    <div className="space-y-0">
      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <DataTableHeaderRow>
              <DataTableHead className="h-9 px-3">Member</DataTableHead>
              <DataTableHead className="h-9 px-3 text-right">Logged</DataTableHead>
              <DataTableHead className="h-9 px-3 text-right">Billable</DataTableHead>
              <DataTableHead className="h-9 px-3 text-right">Utilization</DataTableHead>
            </DataTableHeaderRow>
          </TableHeader>
          <TableBody>
            {data.members.map((member) => (
              <UtilizationRow key={member.userId} member={member} />
            ))}
          </TableBody>
        </Table>
      </div>
      {showPagination && data.totalPages > 1 && page !== undefined && onPageChange ? (
        <TablePagination
          page={page}
          totalPages={data.totalPages}
          total={data.total}
          limit={data.limit}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  );
}
