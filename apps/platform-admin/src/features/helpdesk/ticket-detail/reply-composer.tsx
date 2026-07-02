"use client";

import { Button } from "@kloqra/ui";
import { Send, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type ReplyComposerProps = {
  ticketId: string;
  onMessageSent?: () => void;
};

interface StaffType {
  id: string;
  name: string;
  role: "SUPERADMIN" | "SUPPORT";
}

export function ReplyComposer({ ticketId, onMessageSent }: ReplyComposerProps) {
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [content, setContent] = useState("");
  const [staff, setStaff] = useState<StaffType[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [triggerIndex, setTriggerIndex] = useState(-1);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Load staff for autocomplete
    api<{ items: StaffType[] }>("/platform/staff?limit=100")
      .then((res) => {
        setStaff(res.items || []);
      })
      .catch(console.error);
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const caret = e.target.selectionStart;
    setContent(value);

    // Autocomplete logic for internal notes only
    if (mode !== "note") {
      setShowDropdown(false);
      return;
    }

    const lastAt = value.lastIndexOf("@", caret - 1);
    if (lastAt !== -1) {
      const isStart = lastAt === 0;
      const hasSpaceBefore = isStart || /\s/.test(value.charAt(lastAt - 1));
      const textBetween = value.substring(lastAt + 1, caret);
      const hasSpaceInBetween = /\s/.test(textBetween);

      if (hasSpaceBefore && !hasSpaceInBetween) {
        setShowDropdown(true);
        setSearchQuery(textBetween);
        setTriggerIndex(lastAt);
        setDropdownIndex(0);
        return;
      }
    }
    setShowDropdown(false);
  };

  const suggestions = staff.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const selectSuggestion = (selectedStaff: StaffType) => {
    const before = content.substring(0, triggerIndex);
    const after = content.substring(triggerIndex + searchQuery.length + 1);
    const inserted = `${before}@${selectedStaff.name} ${after}`;
    setContent(inserted);
    setShowDropdown(false);

    // Place cursor after the inserted text
    setTimeout(() => {
      const textarea = document.getElementById("reply-textarea") as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        const newPos = triggerIndex + selectedStaff.name.length + 2; // +1 for @, +1 for space
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropdownIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectSuggestion(suggestions[dropdownIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSending(true);

    try {
      await api(`/platform/helpdesk/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: content,
          direction: mode === "note" ? "INTERNAL" : "OUTBOUND"
        })
      });
      setContent("");
      onMessageSent?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => {
            setMode("reply");
            setShowDropdown(false);
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mode === "reply"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Reply
        </button>
        <button
          onClick={() => setMode("note")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mode === "note"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Internal Note
        </button>
      </div>

      <div
        className={`relative rounded-lg border transition-colors ${
          mode === "note"
            ? "bg-amber-50/30 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/50"
            : "bg-background border-border"
        }`}
      >
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 z-50 w-64 bg-card border border-border rounded-lg shadow-lg p-1 max-h-48 overflow-y-auto">
            {suggestions.map((s, index) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSuggestion(s)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded flex items-center justify-between transition-colors ${
                  index === dropdownIndex
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span>{s.name}</span>
                <span className="text-[10px] text-muted-foreground bg-muted-foreground/10 px-1 rounded uppercase tracking-wider font-semibold">
                  {s.role}
                </span>
              </button>
            ))}
          </div>
        )}

        <textarea
          id="reply-textarea"
          placeholder={
            mode === "reply"
              ? "Type your reply to the requester..."
              : "Type an internal note visible only to agents (use @ to mention)..."
          }
          className="min-h-[120px] w-full resize-y border-0 focus:outline-none focus:ring-0 bg-transparent p-4 text-sm text-foreground focus-visible:outline-none"
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <div className="flex items-center justify-between p-3 border-t border-border bg-muted/5 rounded-b-lg">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {mode === "note" && <Lock className="h-3 w-3" />}
            {mode === "note" ? "Visible to agents only" : "Will be sent via email"}
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || sending}
            className={mode === "note" ? "bg-amber-600 hover:bg-amber-700 text-white border-0" : ""}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : mode === "note" ? "Add Note" : "Send Reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}
