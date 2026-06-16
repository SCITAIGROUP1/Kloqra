"use client";

import { cn } from "@kloqra/ui";
import { MessageCircle } from "lucide-react";
import { useAssistant } from "./assistant-provider";

type AssistantLauncherProps = {
  className?: string;
};

export function AssistantLauncher({ className }: AssistantLauncherProps) {
  const { view, openAssistant, launcherSuppressed } = useAssistant();
  const expanded = view === "expanded";
  const hidden = expanded || launcherSuppressed;

  return (
    <button
      type="button"
      className={cn(
        "fixed z-50 flex size-14 items-center justify-center rounded-full border border-primary/20 bg-primary text-primary-foreground shadow-lg transition-all duration-200",
        "hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "motion-reduce:transition-none motion-reduce:hover:scale-100",
        "bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]",
        hidden && "pointer-events-none scale-0 opacity-0",
        className
      )}
      aria-label="Open help assistant"
      aria-expanded={expanded}
      aria-hidden={hidden}
      aria-controls="assistant-chat-panel"
      onClick={openAssistant}
    >
      <MessageCircle className="size-6" strokeWidth={1.5} aria-hidden />
    </button>
  );
}
