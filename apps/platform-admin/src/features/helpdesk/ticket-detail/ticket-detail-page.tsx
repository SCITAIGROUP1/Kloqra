"use client";

import { useEffect, useState } from "react";
import { ConversationThread } from "./conversation-thread";
import { TicketSidebar } from "./ticket-sidebar";
import { api } from "@/lib/api";

export function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>(`/platform/helpdesk/tickets/${ticketId}`)
      .then(setTicket)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticketId]);

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

  return (
    <div className="flex h-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 border-r">
        <ConversationThread ticket={ticket} />
      </div>
      <div className="w-80 flex-shrink-0 bg-muted/10 overflow-y-auto">
        <TicketSidebar ticket={ticket} />
      </div>
    </div>
  );
}
