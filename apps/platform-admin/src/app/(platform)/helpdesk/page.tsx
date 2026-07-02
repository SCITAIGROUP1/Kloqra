"use client";

import {
  AppBar,
  AppBarListToolbar,
  appBarListFilterTriggerClass,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableLoadingState
} from "@kloqra/ui";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  TicketTypeBadge,
  PriorityDot,
  StatusBadge
} from "@/features/helpdesk/shared/ticket-type-config";
import { useHelpdeskTickets } from "@/features/helpdesk/use-helpdesk-tickets";

export default function HelpDeskPage() {
  const {
    tickets,
    total,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,
    assigneeFilter,
    setAssigneeFilter
  } = useHelpdeskTickets();

  return (
    <div className="space-y-6">
      <AppBar
        title="All Tickets"
        description="Manage and respond to support requests."
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search tickets by subject or requester..."
            searchAriaLabel="Search tickets"
            filters={
              <>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value)}>
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by channel"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All channels</SelectItem>
                    <SelectItem value="WEB_FORM">Web Form</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={assigneeFilter} onValueChange={(value) => setAssigneeFilter(value)}>
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by assignee"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All tickets</SelectItem>
                    <SelectItem value="ASSIGNED_TO_ME">Assigned to me</SelectItem>
                    <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          />
        }
      />

      <DataTableCard>
        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : loading ? (
          <TableLoadingState rows={5} columns={7} />
        ) : tickets.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No tickets found"
              description="Try adjusting your filters or check back later."
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Subject</DataTableHead>
                  <DataTableHead>Requester</DataTableHead>
                  <DataTableHead>Assignee</DataTableHead>
                  <DataTableHead>Queue & Channel</DataTableHead>
                  <DataTableHead>Priority</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Created</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <DataTableCell>
                      <Link
                        href={`/helpdesk/${ticket.id}`}
                        className="hover:underline font-medium block"
                      >
                        {ticket.subject}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <TicketTypeBadge type={ticket.ticketType} />
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="font-medium text-sm">{ticket.requesterName}</div>
                      <div className="text-xs text-muted-foreground">{ticket.requesterEmail}</div>
                    </DataTableCell>
                    <DataTableCell>
                      {ticket.assignedToName ? (
                        <div className="font-medium text-sm text-foreground">
                          {ticket.assignedToName}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="font-medium text-sm">{ticket.queueName}</div>
                      <div className="text-xs text-muted-foreground">
                        {ticket.channel.replace("_", " ")}
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <PriorityDot priority={ticket.priority as any} />
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge status={ticket.status} />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </div>
                    </DataTableCell>
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
              onLimitChange={setLimit}
              disabled={loading}
            />
          </>
        )}
      </DataTableCard>
    </div>
  );
}
