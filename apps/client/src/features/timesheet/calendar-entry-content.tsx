"use client";

import { cn } from "@kloqra/ui";
import { Clock, Lock } from "lucide-react";
import { formatDuration } from "./calendar-utils";

export type CalendarTaskInfo = {
  taskName: string;
  categoryName: string;
  projectName?: string;
};

type CalendarEntryContentProps = {
  task: CalendarTaskInfo;
  description?: string | null;
  durationSec: number;
  compact: boolean;
  variant?: "default" | "timer" | "live" | "locked";
  liveElapsedSec?: number;
};

export function CalendarEntryContent({
  task,
  description,
  durationSec,
  compact,
  variant = "default",
  liveElapsedSec
}: CalendarEntryContentProps) {
  const elapsedLabel =
    variant === "live" && liveElapsedSec !== undefined
      ? formatDuration(liveElapsedSec)
      : formatDuration(durationSec);
  const isShort = durationSec < 15 * 60 && variant !== "live";
  const showDescription = Boolean(description?.trim()) && !compact && !isShort;
  const isLocked = variant === "locked";

  return (
    <div className="flex h-full min-h-0 flex-col gap-0.5 overflow-hidden text-left">
      <div className="flex min-w-0 items-center justify-between gap-1">
        <span
          className={cn(
            "truncate rounded px-1 py-px font-medium uppercase tracking-wide opacity-90",
            compact || isShort ? "text-[8px]" : "text-[9px]"
          )}
        >
          {task.categoryName}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {isLocked ? (
            <span title="Locked — submitted or approved">
              <Lock
                className={cn(
                  "shrink-0 text-muted-foreground",
                  compact || isShort ? "size-2.5" : "size-3"
                )}
                aria-label="Locked"
              />
            </span>
          ) : null}
          <span
            className={cn(
              "font-mono font-semibold tabular-nums",
              compact || isShort ? "text-[9px]" : "text-[10px]"
            )}
          >
            {elapsedLabel}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 items-start gap-1">
        {variant === "timer" && (
          <Clock className="mt-0.5 size-2.5 shrink-0 opacity-70" aria-hidden />
        )}
        {variant === "live" && (
          <span
            className="mt-1 size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400"
            aria-hidden
          />
        )}
        <p
          className={cn(
            "min-w-0 flex-1 truncate font-semibold leading-tight",
            compact || isShort ? "text-[10px]" : "text-[11px]"
          )}
        >
          {task.taskName}
        </p>
      </div>

      {showDescription && (
        <p className="line-clamp-2 text-[10px] leading-snug opacity-80">{description}</p>
      )}

      {!compact && !isShort && task.projectName && (
        <p className="truncate text-[9px] opacity-65">{task.projectName}</p>
      )}
    </div>
  );
}
