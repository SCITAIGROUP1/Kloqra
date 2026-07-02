import { formatDistanceToNow } from "date-fns";
import { UserCircle2, Lock } from "lucide-react";
import { ReplyComposer } from "./reply-composer";
import type { TicketType, HelpDeskTicketMessage } from "./ticket-detail-page";

function highlightMentions(text: string) {
  // Matches @ followed by capitalized words (e.g. @Kloqra Support Agent or @David CEO)
  const regex = /@([A-Z][a-zA-Z0-9_]+(?:\s+[A-Z][a-zA-Z0-9_]+)*)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    parts.push(
      <span
        key={match.index}
        className="px-1 py-0.5 rounded bg-primary/10 text-primary font-semibold align-baseline select-all"
      >
        {match[0]}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function ConversationThread({
  ticket,
  onMessageSent
}: {
  ticket: TicketType;
  onMessageSent?: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {ticket.messages && ticket.messages.length > 0 ? (
            ticket.messages.map((msg: HelpDeskTicketMessage) => {
              const isInternal = msg.direction === "INTERNAL";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${isInternal || msg.senderType === "AGENT" ? "flex-row-reverse" : ""}`}
                >
                  <div className="mt-1 h-8 w-8 rounded-full bg-muted flex shrink-0 items-center justify-center">
                    <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div
                    className={`flex-1 p-4 rounded-lg border ${
                      isInternal
                        ? "bg-amber-50/30 border-amber-200/80 dark:bg-amber-950/10 dark:border-amber-900/40"
                        : msg.senderType === "AGENT"
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-border"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 mb-2 ${
                        isInternal || msg.senderType === "AGENT" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span className="font-semibold text-sm">
                        {msg.senderType === "AGENT" ? msg.senderName : ticket.requesterName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                      {isInternal && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium border border-amber-200/50">
                          <Lock className="h-3 w-3" />
                          Internal Note
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-sm text-foreground/90 whitespace-pre-wrap ${
                        isInternal || msg.senderType === "AGENT" ? "text-right" : ""
                      }`}
                    >
                      {highlightMentions(msg.body)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground text-sm">No messages yet.</div>
          )}
        </div>
      </div>

      <div className="p-4 border-t bg-background">
        <ReplyComposer ticketId={ticket.id} onMessageSent={onMessageSent} />
      </div>
    </div>
  );
}
