"use client";

import type { AssistantChatMessageDto } from "@kloqra/contracts";
import { Button, cn } from "@kloqra/ui";
import {
  ArrowRight,
  Loader2,
  MessageCircle,
  Minus,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getContextualPrompts } from "./assistant-prompts";
import { useAssistant } from "./assistant-provider";
import { useAssistantChat } from "./use-assistant-chat";
import { useSessionStore } from "@/stores/session.store";

function renderSimpleMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-2">
      <span
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-hidden
      >
        <MessageCircle className="size-3.5" strokeWidth={1.5} />
      </span>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Thinking…
        </span>
      </div>
    </div>
  );
}

type AssistantChatProps = {
  compact?: boolean;
};

export function AssistantChat({ compact = false }: AssistantChatProps) {
  const pathname = usePathname();
  const firstName = useSessionStore((s) => s.session?.user.firstName);
  const {
    view,
    openAssistant,
    minimizeAssistant,
    closeAssistant,
    turns,
    appendTurn,
    clearTurns,
    feedback,
    setTurnFeedback
  } = useAssistant();
  const { sendMessage, loading, error, clearError } = useAssistantChat();
  const [draft, setDraft] = useState("");
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const starterPrompts = getContextualPrompts(pathname);

  const expanded = view === "expanded";
  const minimized = view === "minimized";

  useEffect(() => {
    if (expanded && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [expanded, turns, loading, error]);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        minimizeAssistant();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, minimizeAssistant]);

  const submit = useCallback(
    async (text: string, options?: { retry?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setDraft("");
      clearError();
      setLastFailedMessage(null);

      const history: AssistantChatMessageDto[] = turns
        .filter((t) => t.role === "user" || t.role === "assistant")
        .map((t) => ({ role: t.role, content: t.content }));

      if (!options?.retry) {
        appendTurn({ role: "user", content: trimmed });
      }

      const apiHistory =
        options?.retry && history.at(-1)?.role === "user" && history.at(-1)?.content === trimmed
          ? history.slice(0, -1)
          : history;

      const response = await sendMessage(apiHistory, trimmed);
      if (!response) {
        setLastFailedMessage(trimmed);
        return;
      }

      appendTurn({
        role: "assistant",
        content: response.reply,
        links: response.links
      });
    },
    [appendTurn, clearError, loading, sendMessage, turns]
  );

  const retryLastMessage = useCallback(() => {
    if (!lastFailedMessage) return;
    void submit(lastFailedMessage, { retry: true });
  }, [lastFailedMessage, submit]);

  const greetingName = firstName?.trim() || "there";

  if (view === "collapsed") return null;

  return (
    <div
      ref={panelRef}
      id="assistant-chat-panel"
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-200 motion-reduce:animate-none",
        "bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] right-[max(1rem,env(safe-area-inset-right))]",
        "w-[min(calc(100vw-2rem),380px)]",
        compact || minimized ? "h-auto" : "h-[min(520px,calc(100vh-8rem))]"
      )}
      role="dialog"
      aria-label="Help assistant"
      aria-modal={expanded}
    >
      <div className="h-1 shrink-0 bg-primary" aria-hidden />

      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium"
          onClick={minimized ? openAssistant : undefined}
          aria-label={minimized ? "Expand help assistant" : undefined}
          disabled={!minimized}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="size-3.5" strokeWidth={1.5} aria-hidden />
          </span>
          <span className="truncate">Ask Kloqra</span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          {!minimized ? (
            <>
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Start new chat"
                disabled={loading || turns.length === 0}
                onClick={clearTurns}
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Minimize help assistant"
                onClick={minimizeAssistant}
              >
                <Minus className="size-4" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close help assistant"
            onClick={closeAssistant}
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {minimized ? null : (
        <>
          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
            aria-live="polite"
            aria-relevant="additions"
          >
            {turns.length === 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Hi {greetingName}!</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ask how to track time, submit timesheets, or find features in the member app.
                </p>
              </div>
            ) : null}

            {turns.map((turn, index) => {
              const isUser = turn.role === "user";
              const turnFeedback = feedback.find((item) => item.turnIndex === index);
              const showFeedback = !isUser;

              return (
                <div
                  key={`${turn.role}-${index}`}
                  className={cn(
                    "space-y-2",
                    isUser ? "flex flex-col items-end" : "flex flex-col items-start"
                  )}
                >
                  <div className={cn("flex max-w-[90%] gap-2", isUser && "flex-row-reverse")}>
                    {!isUser ? (
                      <span
                        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                        aria-hidden
                      >
                        <MessageCircle className="size-3.5" strokeWidth={1.5} />
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2.5 text-sm leading-relaxed",
                        isUser
                          ? "rounded-tr-sm bg-primary/10 text-foreground"
                          : "rounded-tl-sm bg-muted text-foreground"
                      )}
                    >
                      {renderSimpleMarkdown(turn.content)}
                    </div>
                  </div>

                  {turn.links && turn.links.length > 0 ? (
                    <div className={cn("flex flex-wrap gap-2", !isUser && "ml-9")}>
                      {turn.links.map((link) => (
                        <Button
                          key={link.href}
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          asChild
                        >
                          <Link href={link.href} onClick={() => minimizeAssistant()}>
                            {link.label}
                            <ArrowRight className="size-3.5" aria-hidden />
                          </Link>
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  {showFeedback ? (
                    <div className="ml-9 flex items-center gap-1">
                      <button
                        type="button"
                        className={cn(
                          "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          turnFeedback?.helpful === true && "bg-accent text-foreground"
                        )}
                        aria-label="Helpful response"
                        aria-pressed={turnFeedback?.helpful === true}
                        onClick={() => setTurnFeedback(index, true)}
                      >
                        <ThumbsUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          turnFeedback?.helpful === false && "bg-accent text-foreground"
                        )}
                        aria-label="Unhelpful response"
                        aria-pressed={turnFeedback?.helpful === false}
                        onClick={() => setTurnFeedback(index, false)}
                      >
                        <ThumbsDown className="size-3.5" />
                      </button>
                      {turnFeedback?.helpful === false ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          Thanks for the feedback.
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {loading ? <ThinkingBubble /> : null}

            {error ? (
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                  aria-hidden
                >
                  <MessageCircle className="size-3.5" strokeWidth={1.5} />
                </span>
                <div className="max-w-[90%] space-y-2 rounded-2xl rounded-tl-sm border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                  <p>{error}</p>
                  {lastFailedMessage ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={retryLastMessage}
                    >
                      Try again
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {turns.length === 0 && !loading ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {starterPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal text-left text-xs"
                    onClick={() => void submit(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <form
            className="flex shrink-0 gap-2 border-t border-border/70 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(draft);
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask a question…"
              maxLength={2000}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loading}
              aria-label="Assistant message"
            />
            <Button type="submit" size="sm" disabled={loading || !draft.trim()}>
              Send
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
