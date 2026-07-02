"use client";

import { AppBar, Button, cn } from "@kloqra/ui";
import { usePlatformSessionStore } from "@kloqra/web-shared";
import { ArrowLeft, PanelRightOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ConversationThread } from "./conversation-thread";
import { TicketSidebar } from "./ticket-sidebar";
import { api } from "@/lib/api";

export interface HelpDeskTicketMessage {
  id: string;
  ticketId: string;
  senderType: "AGENT" | "USER";
  senderName: string;
  body: string;
  createdAt: string;
  direction?: "INBOUND" | "OUTBOUND" | "INTERNAL";
}

export interface TicketType {
  id: string;
  ticketNumber: number;
  subject: string;
  status: "OPEN" | "PENDING" | "IN_PROGRESS" | "ON_HOLD" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ticketType:
    | "BUG_REPORT"
    | "BILLING"
    | "PLAN_QUESTION"
    | "FEATURE_REQUEST"
    | "IN_APP_REPORT"
    | "SECURITY"
    | "GENERAL";
  channel: "WEB_FORM" | "EMAIL" | "PLATFORM_ADMIN" | "API";
  queueName: string;
  requesterName: string;
  requesterEmail: string;
  tenantName?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  slaBreached: boolean;
  firstResponseDue?: string | null;
  resolutionDue?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  messages?: HelpDeskTicketMessage[];
}

export function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const session = usePlatformSessionStore((s) => s.session);

  useEffect(() => {
    api<TicketType>(`/platform/helpdesk/tickets/${ticketId}`)
      .then(setTicket)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticketId]);
  const reloadTicket = () => {
    api<TicketType>(`/platform/helpdesk/tickets/${ticketId}`).then(setTicket).catch(console.error);
  };

  const updateTicket = async (fields: { status?: string; assignedToId?: string | null }) => {
    try {
      const result = await api<{
        status: TicketType["status"];
        assignedToId: string | null;
        assignedToName?: string | null;
        resolvedAt?: string | null;
      }>(`/platform/helpdesk/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify(fields)
      });
      setTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: result.status,
          assignedToId: result.assignedToId,
          assignedToName: result.assignedToName,
          resolvedAt: result.resolvedAt
        };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update ticket.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading ticket...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        Ticket not found
      </div>
    );
  }

  const isAssignedToMe = session?.user?.id === ticket.assignedToId;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <AppBar
        className="mx-0 mb-0 px-6 lg:px-8 border-b"
        title={
          <div className="flex items-center gap-2">
            <Link
              href="/helpdesk"
              className="p-1.5 hover:bg-muted rounded-full transition-colors shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="truncate">{ticket.subject}</span>
          </div>
        }
        description={
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>Ticket: #{ticket.ticketNumber}</span>
            <span>•</span>
            <span>Requester: {ticket.requesterName}</span>
            <span>•</span>
            <span>Assigned: {ticket.assignedToName || "Unassigned"}</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Ticket Assignment Action */}
            <Button
              size="sm"
              variant="outline"
              onClick={
                isAssignedToMe
                  ? () => updateTicket({ assignedToId: null })
                  : () => updateTicket({ assignedToId: session?.user?.id })
              }
            >
              {isAssignedToMe ? "Unassign" : "Assign to me"}
            </Button>

            {/* Ticket Status Transition Actions */}
            {ticket.status === "RESOLVED" ? (
              <Button size="sm" onClick={() => updateTicket({ status: "IN_PROGRESS" })}>
                Reopen Ticket
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className={
                    ticket.status === "ON_HOLD"
                      ? "text-primary"
                      : "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  }
                  onClick={() =>
                    updateTicket({
                      status: ticket.status === "ON_HOLD" ? "IN_PROGRESS" : "ON_HOLD"
                    })
                  }
                >
                  {ticket.status === "ON_HOLD" ? "Resume Ticket" : "Mark On Hold"}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => updateTicket({ status: "RESOLVED" })}
                >
                  Mark Resolved
                </Button>
              </>
            )}

            {/* Sidebar toggle button visible only on mobile/tablet */}
            <Button
              size="sm"
              variant="outline"
              className="lg:hidden h-9 w-9 p-0"
              onClick={() => setShowSidebar(true)}
              aria-label="View Details"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Main conversation thread */}
        <div className="flex-1 flex flex-col min-w-0 border-r h-full overflow-hidden">
          <ConversationThread ticket={ticket} onMessageSent={reloadTicket} />
        </div>

        {/* Backdrop for mobile details sidebar */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar panel */}
        <div
          className={cn(
            "w-80 flex-shrink-0 bg-muted/10 overflow-hidden lg:block lg:h-full lg:relative lg:translate-x-0 border-l lg:border-l-0",
            // Mobile Overlay logic: slides in from right when showSidebar is true
            "fixed inset-y-0 right-0 z-50 transition-transform duration-300 transform lg:transform-none bg-background",
            showSidebar ? "translate-x-0" : "translate-x-full"
          )}
        >
          <TicketSidebar ticket={ticket} onClose={() => setShowSidebar(false)} />
        </div>
      </div>
    </div>
  );
}
