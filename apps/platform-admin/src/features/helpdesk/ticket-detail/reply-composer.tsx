"use client";

import { Button } from "@kloqra/ui";
import { Send, Lock } from "lucide-react";
import { useState } from "react";

export function ReplyComposer({ ticketId: _ticketId }: { ticketId: string }) {
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    // TODO: implement API post
    setContent("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setMode("reply")}
          className={`px-4 py-2 ${mode === "reply" ? "font-bold" : ""}`}
        >
          Reply
        </button>
        <button
          onClick={() => setMode("note")}
          className={`px-4 py-2 ${mode === "note" ? "font-bold" : ""}`}
        >
          Internal Note
        </button>
      </div>

      <div
        className={`relative rounded-lg border ${mode === "note" ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50" : "bg-background"}`}
      >
        <textarea
          placeholder={
            mode === "reply"
              ? "Type your reply to the requester..."
              : "Type an internal note visible only to agents..."
          }
          className="min-h-[120px] w-full resize-y border-0 focus-visible:ring-0 bg-transparent p-4"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center justify-between p-3 border-t bg-muted/10 rounded-b-lg">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {mode === "note" && <Lock className="h-3 w-3" />}
            {mode === "note" ? "Visible to agents only" : "Will be sent via email"}
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim()}
            className={mode === "note" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
          >
            <Send className="h-4 w-4 mr-2" />
            {mode === "note" ? "Add Note" : "Send Reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}
