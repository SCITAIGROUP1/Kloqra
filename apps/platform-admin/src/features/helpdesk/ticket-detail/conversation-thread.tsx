import { formatDistanceToNow } from "date-fns";
import { UserCircle2 } from "lucide-react";
import { ReplyComposer } from "./reply-composer";

export function ConversationThread({ ticket }: { ticket: any }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-muted/5">
        <h2 className="text-lg font-medium">{ticket.subject}</h2>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {ticket.messages && ticket.messages.length > 0 ? (
            ticket.messages.map((msg: any) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.senderType === "AGENT" ? "flex-row-reverse" : ""}`}
              >
                <div className="mt-1 h-8 w-8 rounded-full bg-muted flex shrink-0 items-center justify-center">
                  <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div
                  className={`flex-1 p-4 rounded-lg border ${msg.senderType === "AGENT" ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}
                >
                  <div
                    className={`flex items-center gap-2 mb-2 ${msg.senderType === "AGENT" ? "flex-row-reverse" : ""}`}
                  >
                    <span className="font-medium text-sm">
                      {msg.senderType === "AGENT" ? msg.senderName : ticket.requesterName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div
                    className={`text-sm text-foreground/90 whitespace-pre-wrap ${msg.senderType === "AGENT" ? "text-right" : ""}`}
                  >
                    {msg.body}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground text-sm">No messages yet.</div>
          )}
        </div>
      </div>

      <div className="p-4 border-t bg-background">
        <ReplyComposer ticketId={ticket.id} />
      </div>
    </div>
  );
}
