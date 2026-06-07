"use client";

import type { TimeLogDto } from "@chronomint/contracts";
import { cn } from "@chronomint/ui";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import {
  buildSlotRows,
  clipLogToDay,
  blockStyle,
  formatDayHeader,
  formatTimeLabel,
  pointerYToTime,
  SLOT_MINUTES,
  toDateKey,
  isSameDayInZone,
  getZoneHourAndMinute,
  CALENDAR_START_HOUR,
  CALENDAR_END_HOUR,
  todayInZone
} from "./calendar-utils";
import { entryColorsFromProject } from "@/lib/project-color-styles";

export type SlotSelect = {
  dayKey: string;
  startIndex: number;
  endIndex: number;
};

type EntryPreview = {
  log: TimeLogDto;
  day: Date;
  start: Date;
  end: Date;
};

const MOVE_THRESHOLD_PX = 5;

/** Avoid updating parent state while this tree is still rendering (React 19). */
function deferToParent(fn: () => void) {
  queueMicrotask(fn);
}

type TimesheetCalendarProps = {
  view: "day" | "week";
  days: Date[];
  logs: TimeLogDto[];
  taskName: (taskId: string) => string;
  entryColor: (taskId: string) => string;
  onSlotClick: (day: Date, hour: number, minute: number) => void;
  onSlotRangeSelect: (day: Date, startIndex: number, endIndex: number) => void;
  onEntryClick: (log: TimeLogDto) => void;
  onEntryResize: (log: TimeLogDto, start: Date, end: Date) => void;
  onEntryMove: (log: TimeLogDto, start: Date, end: Date) => void;
  onEntryDuplicate: (log: TimeLogDto, start: Date, end: Date) => void;
  readOnly?: boolean;
  timezone?: string;
  showSummary?: boolean;
};

function findDayColumnAt(clientX: number, clientY: number, days: Date[]): Date | null {
  const el = document.elementFromPoint(clientX, clientY);
  const col = el?.closest("[data-day-column]");
  if (!col) return null;
  const key = col.getAttribute("data-day-column");
  return days.find((d) => toDateKey(d) === key) ?? null;
}

function columnRect(day: Date): DOMRect | null {
  const col = document.querySelector(`[data-day-column="${toDateKey(day)}"]`);
  return col?.getBoundingClientRect() ?? null;
}

export function TimesheetCalendar({
  view,
  days,
  logs,
  taskName,
  entryColor,
  onSlotClick,
  onSlotRangeSelect,
  onEntryClick,
  onEntryResize,
  onEntryMove,
  onEntryDuplicate,
  readOnly = false,
  timezone = "UTC",
  showSummary = true
}: TimesheetCalendarProps) {
  const slotRows = buildSlotRows();
  const today = todayInZone(timezone);
  const [drag, setDrag] = useState<SlotSelect | null>(null);
  const dragMoved = useRef(false);
  const suppressClick = useRef(false);

  const [resize, setResize] = useState<{
    log: TimeLogDto;
    day: Date;
    edge: "start" | "end";
    previewStart: Date;
    previewEnd: Date;
  } | null>(null);

  const [duplicate, setDuplicate] = useState<{
    log: TimeLogDto;
    durationMs: number;
    grabOffsetY: number;
    preview: EntryPreview;
  } | null>(null);

  const [move, setMove] = useState<{
    log: TimeLogDto;
    durationMs: number;
    grabOffsetY: number;
    anchorClipStart: Date;
    preview: EntryPreview;
  } | null>(null);

  const pendingEntry = useRef<{
    log: TimeLogDto;
    clip: { start: Date; end: Date };
    day: Date;
    grabOffsetY: number;
    pointerId: number;
    originX: number;
    originY: number;
  } | null>(null);

  const endDrag = useCallback(
    (selection: SlotSelect | null) => {
      if (!selection || !dragMoved.current) return;
      const day = days.find((d) => toDateKey(d) === selection.dayKey);
      if (day) {
        suppressClick.current = true;
        deferToParent(() => onSlotRangeSelect(day, selection.startIndex, selection.endIndex));
      }
      setDrag(null);
      dragMoved.current = false;
    },
    [days, onSlotRangeSelect]
  );

  useEffect(() => {
    if (!drag) return;
    const onUp = () => {
      endDrag(drag);
      setDrag(null);
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [drag, endDrag]);

  useEffect(() => {
    if (!resize) return;
    const onMove = (e: PointerEvent) => {
      const rect = columnRect(resize.day);
      if (!rect) return;
      const t = pointerYToTime(resize.day, e.clientY, rect.top, rect.height, timezone);
      setResize((r) => {
        if (!r) return r;
        if (r.edge === "start") {
          const nextStart =
            t < r.previewEnd ? t : new Date(r.previewEnd.getTime() - SLOT_MINUTES * 60_000);
          return { ...r, previewStart: nextStart };
        }
        const nextEnd =
          t > r.previewStart ? t : new Date(r.previewStart.getTime() + SLOT_MINUTES * 60_000);
        return { ...r, previewEnd: nextEnd };
      });
    };
    const onUp = () => {
      setResize((r) => {
        if (r) {
          const { log, previewStart, previewEnd } = r;
          deferToParent(() => onEntryResize(log, previewStart, previewEnd));
        }
        return null;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resize, onEntryResize, timezone]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const pending = pendingEntry.current;
      if (pending && e.pointerId === pending.pointerId) {
        const dist = Math.hypot(e.clientX - pending.originX, e.clientY - pending.originY);
        if (dist >= MOVE_THRESHOLD_PX) {
          const durationMs =
            new Date(pending.log.endTime).getTime() - new Date(pending.log.startTime).getTime();
          setMove({
            log: pending.log,
            durationMs,
            grabOffsetY: pending.grabOffsetY,
            anchorClipStart: pending.clip.start,
            preview: {
              log: pending.log,
              day: pending.day,
              start: pending.clip.start,
              end: pending.clip.end
            }
          });
          pendingEntry.current = null;
          suppressClick.current = true;
        }
        return;
      }

      if (!move) return;
      const day = findDayColumnAt(e.clientX, e.clientY, days);
      if (!day) return;
      const rect = columnRect(day);
      if (!rect) return;
      const blockTop = e.clientY - move.grabOffsetY;
      const start = pointerYToTime(day, blockTop + 4, rect.top, rect.height, timezone);
      const end = new Date(start.getTime() + move.durationMs);
      setMove((m) => (m ? { ...m, preview: { log: m.log, day, start, end } } : m));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pendingEntry.current?.pointerId === e.pointerId) {
        const log = pendingEntry.current.log;
        pendingEntry.current = null;
        deferToParent(() => onEntryClick(log));
        return;
      }

      if (move && e.pointerId !== undefined) {
        const { log, preview, anchorClipStart } = move;
        if (preview.end > preview.start) {
          const delta = preview.start.getTime() - anchorClipStart.getTime();
          const newStart = new Date(new Date(log.startTime).getTime() + delta);
          const newEnd = new Date(new Date(log.endTime).getTime() + delta);
          suppressClick.current = true;
          deferToParent(() => onEntryMove(log, newStart, newEnd));
        }
        setMove(null);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [move, days, onEntryClick, onEntryMove, timezone]);

  useEffect(() => {
    if (!duplicate) return;
    const onMove = (e: PointerEvent) => {
      const day = findDayColumnAt(e.clientX, e.clientY, days);
      if (!day) return;
      const rect = columnRect(day);
      if (!rect) return;
      const blockTop = e.clientY - duplicate.grabOffsetY;
      const start = pointerYToTime(day, blockTop + 4, rect.top, rect.height, timezone);
      const end = new Date(start.getTime() + duplicate.durationMs);
      setDuplicate((d) => (d ? { ...d, preview: { log: d.log, day, start, end } } : d));
    };
    const onUp = () => {
      setDuplicate((d) => {
        if (d && d.preview.end > d.preview.start) {
          const { log, preview } = d;
          suppressClick.current = true;
          deferToParent(() => onEntryDuplicate(log, preview.start, preview.end));
        }
        return null;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [duplicate, days, onEntryDuplicate, timezone]);

  function startDuplicateDrag(
    log: TimeLogDto,
    clip: { start: Date; end: Date },
    day: Date,
    clientY: number,
    blockTopPx: number
  ) {
    const durationMs = clip.end.getTime() - clip.start.getTime();
    setDuplicate({
      log,
      durationMs,
      grabOffsetY: clientY - blockTopPx,
      preview: { log, day, start: clip.start, end: clip.end }
    });
  }

  function isSlotSelected(dayKey: string, index: number): boolean {
    if (!drag || drag.dayKey !== dayKey) return false;
    const lo = Math.min(drag.startIndex, drag.endIndex);
    const hi = Math.max(drag.startIndex, drag.endIndex);
    return index >= lo && index <= hi;
  }

  function previewOnDay(preview: EntryPreview | undefined, day: Date): EntryPreview | null {
    if (!preview || toDateKey(preview.day) !== toDateKey(day)) return null;
    return preview;
  }

  function startPendingMove(
    log: TimeLogDto,
    clip: { start: Date; end: Date },
    day: Date,
    clientY: number,
    blockTopPx: number,
    pointerId: number,
    originX: number,
    originY: number
  ) {
    pendingEntry.current = {
      log,
      clip,
      day,
      grabOffsetY: clientY - blockTopPx,
      pointerId,
      originX,
      originY
    };
  }

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const performScroll = () => {
      const hasToday = days.some((d) => isSameDayInZone(d, new Date(), timezone));
      if (hasToday) {
        const { hour, minute } = getZoneHourAndMinute(new Date(), timezone);
        // Center the current hour/minute in the container (each hour is 80px high, 2 slots of 40px)
        const currentPos = hour * 80 + (minute / 60) * 80;
        const containerHeight = container.clientHeight || 500;
        container.scrollTop = Math.max(0, currentPos - containerHeight / 2);
      } else {
        // Default scroll position: 7:30 AM (7.5 * 80px = 600px) so 8 AM to 8 PM is centered/visible
        container.scrollTop = 7.5 * 80;
      }
    };

    const handle = setTimeout(performScroll, 50);
    return () => clearTimeout(handle);
  }, [view, days, timezone]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <p className="border-b border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Drag slots to log · Drag block to move · Resize edges · Click to edit ·{" "}
        <kbd className="rounded border border-border bg-muted px-1 font-sans text-[10px]">Ctrl</kbd>
        +drag to duplicate
      </p>
      <div
        ref={scrollContainerRef}
        className={cn(
          "overflow-y-auto select-none transition-all duration-300",
          showSummary
            ? "max-h-[calc(100vh-32rem)] md:max-h-[calc(100vh-33rem)]"
            : "max-h-[calc(100vh-16rem)] md:max-h-[calc(100vh-17rem)]"
        )}
      >
        <div
          className="sticky top-0 z-40 grid border-b border-border bg-card"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div
            className="flex items-center justify-center p-2 text-[9px] font-semibold text-muted-foreground select-none truncate"
            title={`Timezone: ${timezone}`}
          >
            {timezone.split("/").pop()?.replace("_", " ")}
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "border-l border-border p-2 text-center text-sm font-medium",
                isSameDayInZone(day, today, timezone) && "bg-primary/10 text-primary"
              )}
            >
              {formatDayHeader(day)}
            </div>
          ))}
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="relative">
            {slotRows.map(({ hour, minute }) => (
              <div
                key={`${hour}-${minute}`}
                className="flex h-10 items-start justify-end border-b border-border/60 pr-2 pt-0.5 text-[10px] text-muted-foreground"
              >
                {minute === 0 ? formatTimeLabel(hour, minute) : null}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              logs={logs}
              slotRows={slotRows}
              taskName={taskName}
              entryColor={entryColor}
              compact={view === "week"}
              readOnly={readOnly}
              timezone={timezone}
              isSlotSelected={(idx) => isSlotSelected(toDateKey(day), idx)}
              resizePreview={resize && toDateKey(resize.day) === toDateKey(day) ? resize : null}
              movePreview={previewOnDay(move?.preview, day)}
              duplicatePreview={previewOnDay(duplicate?.preview, day)}
              movingLogId={move?.log.id ?? null}
              onSlotPointerDown={(index) => {
                if (readOnly) return;
                dragMoved.current = false;
                setDrag({ dayKey: toDateKey(day), startIndex: index, endIndex: index });
              }}
              onSlotPointerEnter={(index) => {
                if (readOnly) return;
                startTransition(() => {
                  setDrag((d) => {
                    if (!d || d.dayKey !== toDateKey(day)) return d;
                    dragMoved.current = dragMoved.current || index !== d.startIndex;
                    return { ...d, endIndex: index };
                  });
                });
              }}
              onSlotClick={(hour, minute) => {
                if (readOnly) return;
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                deferToParent(() => onSlotClick(day, hour, minute));
              }}
              onEntryClick={(log) => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                deferToParent(() => onEntryClick(log));
              }}
              onResizeStart={(log, clip, edge) => {
                if (readOnly) return;
                setResize({
                  log,
                  day,
                  edge,
                  previewStart: clip.start,
                  previewEnd: clip.end
                });
              }}
              onDuplicateDragStart={startDuplicateDrag}
              onMovePointerDown={startPendingMove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  logs,
  slotRows,
  taskName,
  entryColor,
  compact,
  isSlotSelected,
  resizePreview,
  movePreview,
  duplicatePreview,
  movingLogId,
  readOnly,
  timezone,
  onSlotPointerDown,
  onSlotPointerEnter,
  onSlotClick,
  onEntryClick,
  onResizeStart,
  onDuplicateDragStart,
  onMovePointerDown
}: {
  day: Date;
  logs: TimeLogDto[];
  slotRows: { hour: number; minute: number }[];
  taskName: (taskId: string) => string;
  entryColor: (taskId: string) => string;
  compact: boolean;
  isSlotSelected: (index: number) => boolean;
  resizePreview: {
    log: TimeLogDto;
    previewStart: Date;
    previewEnd: Date;
  } | null;
  movePreview: EntryPreview | null;
  duplicatePreview: EntryPreview | null;
  movingLogId: string | null;
  readOnly: boolean;
  timezone: string;
  onSlotPointerDown: (index: number) => void;
  onSlotPointerEnter: (index: number) => void;
  onSlotClick: (hour: number, minute: number) => void;
  onEntryClick: (log: TimeLogDto) => void;
  onResizeStart: (log: TimeLogDto, clip: { start: Date; end: Date }, edge: "start" | "end") => void;
  onDuplicateDragStart: (
    log: TimeLogDto,
    clip: { start: Date; end: Date },
    day: Date,
    clientY: number,
    blockTopPx: number
  ) => void;
  onMovePointerDown: (
    log: TimeLogDto,
    clip: { start: Date; end: Date },
    day: Date,
    clientY: number,
    blockTopPx: number,
    pointerId: number,
    originX: number,
    originY: number
  ) => void;
}) {
  const dayKey = toDateKey(day);
  const columnRef = useRef<HTMLDivElement>(null);
  const dayLogs = logs
    .map((log) => ({ log, clip: clipLogToDay(log, day, timezone) }))
    .filter((x): x is { log: TimeLogDto; clip: { start: Date; end: Date } } => x.clip !== null);

  const isDuplicatingThis = duplicatePreview?.log.id;
  const isMovingThis = movingLogId;

  return (
    <div ref={columnRef} className="relative border-l border-border" data-day-column={dayKey}>
      {slotRows.map(({ hour, minute }, index) => (
        <button
          key={`${hour}-${minute}`}
          type="button"
          className={cn(
            "block h-10 w-full touch-none border-b border-border/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            !readOnly && "hover:bg-primary/10",
            isSlotSelected(index) && "bg-primary/25"
          )}
          aria-label={`${formatTimeLabel(hour, minute)}`}
          onPointerDown={(e) => {
            if (readOnly) return;
            if (e.ctrlKey || e.metaKey) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            onSlotPointerDown(index);
          }}
          onPointerEnter={() => {
            if (!readOnly) onSlotPointerEnter(index);
          }}
          onClick={() => {
            if (!readOnly) onSlotClick(hour, minute);
          }}
        />
      ))}
      <div className="pointer-events-none absolute inset-0">
        {movePreview && (
          <EntryGhost
            preview={movePreview}
            taskName={taskName}
            entryColor={entryColor}
            compact={compact}
            variant="move"
            timezone={timezone}
          />
        )}
        {duplicatePreview && (
          <EntryGhost
            preview={duplicatePreview}
            taskName={taskName}
            entryColor={entryColor}
            compact={compact}
            variant="duplicate"
            timezone={timezone}
          />
        )}
        {dayLogs.map(({ log, clip }) => {
          const isResizing = resizePreview?.log.id === log.id;
          const isDraggingCopy = isDuplicatingThis === log.id;
          const isDraggingMove = isMovingThis === log.id;
          const display = isResizing
            ? { start: resizePreview.previewStart, end: resizePreview.previewEnd }
            : clip;
          const style = blockStyle(display.start, display.end, timezone);
          const colors = entryColorsFromProject(entryColor(log.taskId));

          return (
            <div
              key={`${log.id}-${clip.start.toISOString()}`}
              className={cn(
                "pointer-events-auto absolute left-0.5 right-0.5 overflow-hidden rounded border shadow-sm",
                (isDraggingCopy || isDraggingMove) && "opacity-40"
              )}
              style={{
                top: style.top,
                height: style.height,
                minHeight: style.height === "0%" ? "0px" : "1.25rem",
                display: style.display,
                ...colors
              }}
            >
              {!readOnly && (
                <div
                  className="absolute inset-x-0 top-0 z-10 h-1.5 cursor-ns-resize bg-black/15"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onResizeStart(log, clip, "start");
                  }}
                />
              )}
              <button
                type="button"
                className={cn(
                  "h-full w-full px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !isDraggingCopy &&
                    !isDraggingMove &&
                    !readOnly &&
                    "cursor-grab hover:brightness-95 active:cursor-grabbing"
                )}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (readOnly) return;
                  const col = columnRef.current;
                  if (!col) return;
                  const rect = col.getBoundingClientRect();
                  const topPct = parseFloat(style.top) / 100;
                  const blockTopPx = rect.top + topPct * rect.height;
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    onDuplicateDragStart(log, clip, day, e.clientY, blockTopPx);
                    return;
                  }
                  onMovePointerDown(
                    log,
                    clip,
                    day,
                    e.clientY,
                    blockTopPx,
                    e.pointerId,
                    e.clientX,
                    e.clientY
                  );
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.ctrlKey || e.metaKey) return;
                  onEntryClick(log);
                }}
                title={
                  readOnly
                    ? taskName(log.taskId)
                    : `${taskName(log.taskId)} — drag to move, Ctrl+drag to duplicate`
                }
              >
                <span
                  className={cn("block truncate font-medium", compact ? "text-[10px]" : "text-xs")}
                >
                  {taskName(log.taskId)}
                </span>
                {!compact && log.description && (
                  <span className="block truncate text-[10px] opacity-80">{log.description}</span>
                )}
              </button>
              {!readOnly && (
                <div
                  className="absolute inset-x-0 bottom-0 z-10 h-1.5 cursor-ns-resize bg-black/15"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onResizeStart(log, clip, "end");
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Live Red Indicator Line for Current Time and Task */}
        <LiveIndicatorLine day={day} dayLogs={dayLogs} taskName={taskName} timezone={timezone} />
      </div>
    </div>
  );
}

function LiveIndicatorLine({
  day,
  dayLogs,
  taskName,
  timezone = "UTC"
}: {
  day: Date;
  dayLogs: { log: TimeLogDto; clip: { start: Date; end: Date } }[];
  taskName: (taskId: string) => string;
  timezone?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!now || !isSameDayInZone(day, now, timezone)) return null;

  const { hour: currentHour, minute: currentMinute } = getZoneHourAndMinute(now, timezone);
  if (currentHour < CALENDAR_START_HOUR || currentHour >= CALENDAR_END_HOUR) return null;

  const totalMin = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60;
  const topMin = currentHour * 60 + currentMinute - CALENDAR_START_HOUR * 60;
  const topPct = (topMin / totalMin) * 100;

  // Find if there is an active running timer log or entry at this specific minute
  const currentDayLogs = dayLogs.filter(({ clip }) => now >= clip.start && now <= clip.end);
  const activeLog = currentDayLogs[0]?.log;
  const activeTaskName = activeLog ? taskName(activeLog.taskId) : null;

  return (
    <div
      className="absolute left-0 right-0 z-30 flex items-center"
      style={{ top: `${topPct}%`, transform: "translateY(-50%)" }}
    >
      <div className="size-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
      <div className="h-0.5 flex-1 bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
      {activeTaskName && (
        <div className="absolute left-3 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-md shadow-md max-w-[120px] truncate font-medium">
          ⚡ {activeTaskName}
        </div>
      )}
    </div>
  );
}

function EntryGhost({
  preview,
  taskName,
  entryColor,
  compact,
  variant,
  timezone = "UTC"
}: {
  preview: EntryPreview;
  taskName: (taskId: string) => string;
  entryColor: (taskId: string) => string;
  compact: boolean;
  variant: "move" | "duplicate";
  timezone?: string;
}) {
  const style = blockStyle(preview.start, preview.end, timezone);
  const colors = entryColorsFromProject(entryColor(preview.log.taskId));
  return (
    <div
      className={cn(
        "absolute left-0.5 right-0.5 z-20 overflow-hidden rounded border-2 px-1 py-0.5 shadow-md",
        variant === "duplicate" && "border-dashed opacity-70"
      )}
      style={{
        top: style.top,
        height: style.height,
        minHeight: style.height === "0%" ? "0px" : "1.25rem",
        display: style.display,
        ...colors,
        ...(variant === "move" ? { opacity: 0.85 } : {})
      }}
    >
      <span className={cn("block truncate font-medium", compact ? "text-[10px]" : "text-xs")}>
        {taskName(preview.log.taskId)}
      </span>
    </div>
  );
}
