import { Button } from "@kloqra/ui";
import { Clock, UserCircle2, Building, Tag } from "lucide-react";
import {
  TicketTypeBadge,
  PriorityDot,
  StatusBadge,
  TicketMetadataPanel
} from "../shared/ticket-type-config";

export function TicketSidebar({ ticket }: { ticket: any }) {
  const minutesLeft = ticket.firstResponseDue
    ? Math.max(0, Math.round((new Date(ticket.firstResponseDue).getTime() - Date.now()) / 60000))
    : null;

  return (
    <div className="p-5 space-y-5 text-sm">
      {/* --- Status & Type --- */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ticket Properties
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Type</span>
            <TicketTypeBadge type={ticket.ticketType} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={ticket.status} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Priority</span>
            <PriorityDot priority={ticket.priority} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Queue</span>
            <span className="flex items-center gap-1 text-xs font-medium">
              <Tag className="h-3 w-3" />
              {ticket.queueName}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* --- SLA --- */}
      {minutesLeft !== null && (
        <>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              SLA
            </h3>
            <div
              className={`flex items-center gap-2 p-3 rounded-lg border ${
                minutesLeft < 15
                  ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                  : minutesLeft < 60
                    ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                    : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
              }`}
            >
              <Clock className="h-4 w-4 shrink-0" />
              <div>
                <div className="text-xs font-medium">First Response Due</div>
                <div className="text-base font-bold">
                  {minutesLeft >= 60
                    ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m`
                    : `${minutesLeft}m`}
                </div>
              </div>
            </div>
          </div>
          <div className="h-px bg-border" />
        </>
      )}

      {/* --- People --- */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          People
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Requester</span>
            <div className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium leading-none">{ticket.requesterName}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{ticket.requesterEmail}</div>
              </div>
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Organization</span>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 shrink-0" />
              {ticket.tenantName && (
                <span className="font-medium text-primary cursor-pointer hover:underline">
                  {ticket.tenantName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Type-specific Metadata --- */}
      {ticket.metadata && Object.keys(ticket.metadata).length > 0 && (
        <>
          <div className="h-px bg-border" />
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Additional Details
            </h3>
            <TicketMetadataPanel ticketType={ticket.ticketType} metadata={ticket.metadata} />
          </div>
        </>
      )}

      {/* --- Actions --- */}
      <div className="h-px bg-border" />
      <div className="space-y-2">
        <Button size="sm" variant="outline" className="w-full justify-start">
          Assign to me
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start text-amber-600 hover:text-amber-700"
        >
          Mark On Hold
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start text-emerald-600 hover:text-emerald-700"
        >
          Mark Resolved
        </Button>
      </div>
    </div>
  );
}
