"use client";

import { DatePicker, Label, cn } from "@kloqra/ui";
import type { TimeEntryDraft } from "./time-entry-draft";
import { estimateRecurrenceCount } from "./time-entry-draft";

type RecurrencePattern = "daily" | "weekdays" | "weekly";

const PATTERN_OPTIONS: { value: RecurrencePattern; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" }
];

export type RepeatEntryPanelProps = {
  open: boolean;
  draft: TimeEntryDraft;
  disabled?: boolean;
  onPatch: (partial: Partial<TimeEntryDraft>) => void;
  onOpenChange: (open: boolean) => void;
};

function recurrencePreviewLabel(recurrence: RecurrencePattern): string {
  switch (recurrence) {
    case "daily":
      return "same time each day";
    case "weekdays":
      return "same time on weekdays";
    case "weekly":
      return "same time each week";
  }
}

export function RepeatEntryPanel({
  open,
  draft,
  disabled = false,
  onPatch,
  onOpenChange
}: RepeatEntryPanelProps) {
  const recurrence = draft.recurrence ?? "none";
  const isActive = open || recurrence !== "none";

  if (!isActive) return null;

  const repeatUntil = draft.repeatUntil ?? draft.date;
  const pattern =
    recurrence === "none" ? ("weekdays" as RecurrencePattern) : (recurrence as RecurrencePattern);
  const entryCount =
    recurrence !== "none"
      ? estimateRecurrenceCount(draft.date, repeatUntil, pattern)
      : estimateRecurrenceCount(draft.date, repeatUntil, "weekdays");

  function removeRepeat() {
    onPatch({ recurrence: "none", repeatUntil: draft.date });
    onOpenChange(false);
  }

  return (
    <div className="space-y-3 rounded-lg bg-muted/40 p-3">
      <Label className="text-sm">Repeat</Label>

      <div className="flex flex-wrap gap-2">
        {PATTERN_OPTIONS.map((option) => {
          const selected = recurrence !== "none" && recurrence === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() =>
                onPatch({
                  recurrence: option.value,
                  repeatUntil: draft.repeatUntil ?? draft.date
                })
              }
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              )}
              aria-pressed={selected}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[auto_1fr]">
        <Label htmlFor="entry-repeat-until" className="text-sm text-muted-foreground">
          Until
        </Label>
        <DatePicker
          value={repeatUntil}
          onChange={(dateKey) => onPatch({ repeatUntil: dateKey })}
          placeholder="Select date"
          ariaLabel="Repeat until"
          disabled={disabled}
          className="h-10 w-full justify-start bg-background"
          popoverAlign="start"
        />
      </div>

      {entryCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          ~{entryCount} {entryCount === 1 ? "entry" : "entries"} · {recurrencePreviewLabel(pattern)}
        </p>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={removeRepeat}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Remove repeat
      </button>
    </div>
  );
}
