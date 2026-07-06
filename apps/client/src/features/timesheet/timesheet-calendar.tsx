"use client";

import type { ActiveTimerDto, TimeLogDto, TimeLogOccupancyItemDto } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import { Building2 } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarEntryContent, type CalendarTaskInfo } from "./calendar-entry-content";
import {
  buildDayOccupancySegments,
  buildSlotRows,
  calendarDateKey,
  clipLogToDay,
  blockStyle,
  computeLogMoveRange,
  findOccupancyConflict,
  formatDayHeader,
  formatDuration,
  formatSegmentTimeRange,
  formatTimeLabel,
  isSlotOccupiedElsewhere,
  pointerYToTime,
  slotIntervalForIndex,
  SLOT_MINUTES,
  isSameDayInZone,
  getZoneHourAndMinute,
  CALENDAR_START_HOUR,
  CALENDAR_END_HOUR,
  todayInZone,
  resolveDayHeaderTotalSeconds
} from "./calendar-utils";
import {
  formatClockLabel,
  formatDayHeader as formatDayHeaderPref,
  formatDayHeaderShort,
  type TimesheetDisplayFormat
} from "./display-format";
import { entryColorsFromProject, inactiveEntryColors } from "@/lib/project-color-styles";

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
const TIME_GUTTER_REM = "3.5rem";
const MIN_DAY_COLUMN_PX = 76;

/** Avoid updating parent state while this tree is still rendering (React 19). */
function deferToParent(fn: () => void) {
  queueMicrotask(fn);
}

export type TimesheetCalendarProps = {
  view: "day" | "week";
  days: Date[];
  logs: TimeLogDto[];
  occupancy: TimeLogOccupancyItemDto[];
  workspaceId: string;
  showOccupancyOverlay: boolean;
  taskName: (taskId: string) => string;
  taskInfo: (taskId: string) => CalendarTaskInfo;
  entryColor: (taskId: string) => string;
  activeTimer?: ActiveTimerDto | null;
  liveElapsedSec?: number;
  isEntryLocked: (log: TimeLogDto) => boolean;
  isEntryInactive?: (log: TimeLogDto) => boolean;
  isTimerEntry: (log: TimeLogDto) => boolean;
  overlapConflictMessage: (conflict: {
    workspaceName: string;
    label: string;
    startTime: string;
    endTime: string;
  }) => string;
  onSlotClick: (day: Date, hour: number, minute: number) => void;
  onSlotRangeSelect: (day: Date, startIndex: number, endIndex: number) => void;
  onEntryClick: (log: TimeLogDto) => void;
  onEntryResize: (log: TimeLogDto, start: Date, end: Date) => void;
  onEntryMove: (log: TimeLogDto, start: Date, end: Date) => void;
  onEntryDuplicate: (log: TimeLogDto, start: Date, end: Date) => void;
  readOnly?: boolean;
  timezone?: string;
  displayFormat?: TimesheetDisplayFormat;
};

function findDayColumnAt(
  clientX: number,
  clientY: number,
  days: Date[],
  timezone: string
): Date | null {
  const el = document.elementFromPoint(clientX, clientY);
  const col = el?.closest("[data-day-column]");
  if (!col) return null;
  const key = col.getAttribute("data-day-column");
  return days.find((d) => calendarDateKey(d, timezone) === key) ?? null;
}

function columnRect(day: Date, timezone: string): DOMRect | null {
  const col = document.querySelector(`[data-day-column="${calendarDateKey(day, timezone)}"]`);
  return col?.getBoundingClientRect() ?? null;
}

export function TimesheetCalendar({
  view,
  days,
  logs,
  occupancy,
  workspaceId,
  showOccupancyOverlay,
  taskName,
  taskInfo,
  entryColor,
  activeTimer,
  liveElapsedSec = 0,
  isEntryLocked,
  isEntryInactive = () => false,
  isTimerEntry,
  overlapConflictMessage,
  onSlotClick,
  onSlotRangeSelect,
  onEntryClick,
  onEntryResize,
  onEntryMove,
  onEntryDuplicate,
  readOnly = false,
  timezone = "UTC",
  displayFormat
}: TimesheetCalendarProps) {
  const slotRows = buildSlotRows();
  const today = todayInZone(timezone);
  const useCompactDayHeaders = days.length > 1;
  const gridTemplateColumns = useCompactDayHeaders
    ? `${TIME_GUTTER_REM} repeat(${days.length}, minmax(${MIN_DAY_COLUMN_PX}px, 1fr))`
    : `${TIME_GUTTER_REM} repeat(${days.length}, minmax(0, 1fr))`;
  const gridMinWidth = useCompactDayHeaders
    ? `calc(${TIME_GUTTER_REM} + ${days.length * MIN_DAY_COLUMN_PX}px)`
    : undefined;

  const labelDay = (day: Date) => {
    if (displayFormat) {
      return useCompactDayHeaders
        ? formatDayHeaderShort(day, displayFormat)
        : formatDayHeaderPref(day, displayFormat);
    }
    if (useCompactDayHeaders) {
      return day.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        ...(timezone ? { timeZone: timezone } : {})
      });
    }
    return formatDayHeader(day, timezone);
  };
  const labelTime = (hour: number, minute: number) =>
    displayFormat ? formatClockLabel(hour, minute, displayFormat) : formatTimeLabel(hour, minute);

  const occupancyByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildDayOccupancySegments>>();
    for (const day of days) {
      const dateKey = calendarDateKey(day, timezone);
      map.set(dateKey, buildDayOccupancySegments(dateKey, occupancy, timezone, workspaceId));
    }
    return map;
  }, [days, occupancy, timezone, workspaceId]);

  const dayHeaderTotals = useMemo(() => {
    const timerState = activeTimer
      ? {
          startedAt: activeTimer.startedAt,
          isPaused: activeTimer.isPaused ?? false,
          elapsedSec: activeTimer.elapsedSec,
          liveElapsedSec
        }
      : null;

    return new Map(
      days.map((day) => [
        calendarDateKey(day, timezone),
        resolveDayHeaderTotalSeconds(logs, day, timezone, timerState)
      ])
    );
  }, [days, logs, timezone, activeTimer, liveElapsedSec]);

  function previewConflict(
    logId: string,
    start: Date,
    end: Date
  ): { invalid: boolean; message?: string } {
    const conflict = findOccupancyConflict(occupancy, start, end, logId);
    if (!conflict) return { invalid: false };
    return { invalid: true, message: overlapConflictMessage(conflict) };
  }
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
      const day = days.find((d) => calendarDateKey(d, timezone) === selection.dayKey);
      if (day) {
        suppressClick.current = true;
        deferToParent(() => onSlotRangeSelect(day, selection.startIndex, selection.endIndex));
      }
      setDrag(null);
      dragMoved.current = false;
    },
    [days, onSlotRangeSelect, timezone]
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
      const rect = columnRect(resize.day, timezone);
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
      const day = findDayColumnAt(e.clientX, e.clientY, days, timezone);
      if (!day) return;
      const rect = columnRect(day, timezone);
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
        const { start: newStart, end: newEnd } = computeLogMoveRange(
          log,
          anchorClipStart,
          preview.start,
          timezone
        );
        const moved =
          newStart.getTime() !== new Date(log.startTime).getTime() ||
          newEnd.getTime() !== new Date(log.endTime).getTime();
        if (moved && newEnd > newStart) {
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
      const day = findDayColumnAt(e.clientX, e.clientY, days, timezone);
      if (!day) return;
      const rect = columnRect(day, timezone);
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
    if (!preview || calendarDateKey(preview.day, timezone) !== calendarDateKey(day, timezone)) {
      return null;
    }
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
        <span className="hidden md:inline">
          Drag slots to log · Drag block to move · Resize edges · Click to edit ·{" "}
          <kbd className="rounded border border-border bg-muted px-1 font-sans text-[10px]">
            Ctrl
          </kbd>
          +drag to duplicate
        </span>
        <span className="md:hidden">
          Tap slots to log · Tap a block to edit · Swipe sideways in week view for more room
        </span>
      </p>
      <div
        ref={scrollContainerRef}
        className="max-h-[calc(100dvh-12rem)] overflow-x-auto overflow-y-auto select-none md:max-h-[calc(100dvh-13rem)]"
      >
        <div style={gridMinWidth ? { minWidth: gridMinWidth } : undefined}>
          <div
            className="sticky top-0 z-40 grid border-b border-border bg-card"
            style={{ gridTemplateColumns }}
          >
            <div
              className="flex items-center justify-center p-2 text-[9px] font-semibold text-muted-foreground select-none truncate"
              title={`Timezone: ${timezone}`}
            >
              {timezone.split("/").pop()?.replace("_", " ")}
            </div>
            {days.map((day) => {
              const isToday = isSameDayInZone(day, today, timezone);
              const totalSec = dayHeaderTotals.get(calendarDateKey(day, timezone)) ?? 0;
              const totalLabel = totalSec > 0 ? formatDuration(totalSec) : null;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex min-w-0 flex-col items-center justify-center gap-0.5 border-l border-border px-1 py-2 text-center sm:px-2",
                    isToday && "bg-primary font-semibold text-primary-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-full truncate text-[11px] font-medium leading-tight sm:text-xs md:text-sm",
                      isToday && "font-semibold"
                    )}
                  >
                    {labelDay(day)}
                  </span>
                  {totalLabel ? (
                    <span
                      className={cn(
                        "w-full truncate text-[10px] font-semibold tabular-nums leading-tight sm:text-[11px]",
                        isToday ? "text-primary-foreground/90" : "text-primary"
                      )}
                      title={`${totalLabel} logged`}
                    >
                      {totalLabel}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="grid" style={{ gridTemplateColumns }}>
            <div className="relative">
              {slotRows.map(({ hour, minute }) => (
                <div
                  key={`${hour}-${minute}`}
                  className="flex h-10 items-start justify-end border-b border-border/60 pr-2 pt-0.5 text-[10px] text-muted-foreground"
                >
                  {minute === 0 ? labelTime(hour, minute) : null}
                </div>
              ))}
            </div>
            {days.map((day) => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                isToday={isSameDayInZone(day, today, timezone)}
                logs={logs}
                elsewhereSegments={occupancyByDay.get(calendarDateKey(day, timezone)) ?? []}
                showOccupancyOverlay={showOccupancyOverlay}
                slotRows={slotRows}
                taskName={taskName}
                taskInfo={taskInfo}
                entryColor={entryColor}
                activeTimer={activeTimer}
                liveElapsedSec={liveElapsedSec}
                compact={view === "week"}
                readOnly={readOnly}
                timezone={timezone}
                isEntryLocked={isEntryLocked}
                isEntryInactive={isEntryInactive}
                isTimerEntry={isTimerEntry}
                previewConflict={previewConflict}
                isSlotSelected={(idx) => isSlotSelected(calendarDateKey(day, timezone), idx)}
                resizePreview={
                  resize && calendarDateKey(resize.day, timezone) === calendarDateKey(day, timezone)
                    ? resize
                    : null
                }
                movePreview={previewOnDay(move?.preview, day)}
                duplicatePreview={previewOnDay(duplicate?.preview, day)}
                movingLogId={move?.log.id ?? null}
                onSlotPointerDown={(index) => {
                  if (readOnly) return;
                  dragMoved.current = false;
                  setDrag({
                    dayKey: calendarDateKey(day, timezone),
                    startIndex: index,
                    endIndex: index
                  });
                }}
                onSlotPointerEnter={(index) => {
                  if (readOnly) return;
                  startTransition(() => {
                    setDrag((d) => {
                      if (!d || d.dayKey !== calendarDateKey(day, timezone)) return d;
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
                  if (readOnly || isEntryLocked(log) || isEntryInactive(log) || isTimerEntry(log))
                    return;
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
                formatSlotLabel={labelTime}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  isToday = false,
  logs,
  elsewhereSegments,
  showOccupancyOverlay,
  slotRows,
  taskName,
  taskInfo,
  entryColor,
  activeTimer,
  liveElapsedSec,
  compact,
  isSlotSelected,
  resizePreview,
  movePreview,
  duplicatePreview,
  movingLogId,
  readOnly,
  timezone,
  isEntryLocked,
  isEntryInactive = () => false,
  isTimerEntry,
  previewConflict,
  onSlotPointerDown,
  onSlotPointerEnter,
  onSlotClick,
  onEntryClick,
  onResizeStart,
  onDuplicateDragStart,
  onMovePointerDown,
  formatSlotLabel
}: {
  day: Date;
  isToday?: boolean;
  logs: TimeLogDto[];
  elsewhereSegments: ReturnType<typeof buildDayOccupancySegments>;
  showOccupancyOverlay: boolean;
  slotRows: { hour: number; minute: number }[];
  taskName: (taskId: string) => string;
  taskInfo: (taskId: string) => CalendarTaskInfo;
  entryColor: (taskId: string) => string;
  activeTimer?: ActiveTimerDto | null;
  liveElapsedSec?: number;
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
  isEntryLocked: (log: TimeLogDto) => boolean;
  isEntryInactive?: (log: TimeLogDto) => boolean;
  isTimerEntry: (log: TimeLogDto) => boolean;
  previewConflict: (
    logId: string,
    start: Date,
    end: Date
  ) => { invalid: boolean; message?: string };
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
  formatSlotLabel: (hour: number, minute: number) => string;
}) {
  const dayKey = calendarDateKey(day, timezone);
  const columnRef = useRef<HTMLDivElement>(null);
  const dayLogs = logs
    .map((log) => ({ log, clip: clipLogToDay(log, day, timezone) }))
    .filter((x): x is { log: TimeLogDto; clip: { start: Date; end: Date } } => x.clip !== null);

  const isDuplicatingThis = duplicatePreview?.log.id;
  const isMovingThis = movingLogId;

  return (
    <div
      ref={columnRef}
      className={cn(
        "relative border-l border-border",
        isToday && "border-l-primary bg-primary/[0.05]"
      )}
      data-day-column={dayKey}
    >
      {slotRows.map(({ hour, minute }, index) => {
        const { start: slotStart, end: slotEnd } = slotIntervalForIndex(dayKey, index, timezone);
        const elsewhereConflict =
          showOccupancyOverlay && !readOnly
            ? isSlotOccupiedElsewhere(slotStart, slotEnd, elsewhereSegments)
            : undefined;
        const slotBlocked = Boolean(elsewhereConflict);

        return (
          <button
            key={`${hour}-${minute}`}
            type="button"
            className={cn(
              "block h-10 w-full touch-manipulation border-b border-border/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              !readOnly && !slotBlocked && "hover:bg-primary/10",
              isSlotSelected(index) && "bg-primary/25",
              slotBlocked && "cursor-not-allowed"
            )}
            aria-label={formatSlotLabel(hour, minute)}
            aria-disabled={slotBlocked || undefined}
            title={
              elsewhereConflict
                ? `Logged in ${elsewhereConflict.workspaceName}: ${elsewhereConflict.label}`
                : undefined
            }
            onPointerDown={(e) => {
              if (readOnly || slotBlocked) return;
              if (e.ctrlKey || e.metaKey) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              onSlotPointerDown(index);
            }}
            onPointerEnter={() => {
              if (!readOnly && !slotBlocked) onSlotPointerEnter(index);
            }}
            onClick={() => {
              if (!readOnly && !slotBlocked) onSlotClick(hour, minute);
            }}
          />
        );
      })}
      <div className="pointer-events-none absolute inset-0">
        {showOccupancyOverlay &&
          elsewhereSegments.map((seg) => (
            <OccupancyElsewhereBand
              key={`elsewhere-${seg.id}-${seg.start.toISOString()}`}
              segment={seg}
              timezone={timezone}
            />
          ))}
        {movePreview &&
          (() => {
            const conflict = previewConflict(
              movePreview.log.id,
              movePreview.start,
              movePreview.end
            );
            return (
              <EntryGhost
                preview={movePreview}
                taskName={taskName}
                entryColor={entryColor}
                compact={compact}
                variant="move"
                timezone={timezone}
                invalid={conflict.invalid}
                invalidMessage={conflict.message}
              />
            );
          })()}
        {duplicatePreview &&
          (() => {
            const conflict = previewConflict(
              duplicatePreview.log.id,
              duplicatePreview.start,
              duplicatePreview.end
            );
            return (
              <EntryGhost
                preview={duplicatePreview}
                taskName={taskName}
                entryColor={entryColor}
                compact={compact}
                variant="duplicate"
                timezone={timezone}
                invalid={conflict.invalid}
                invalidMessage={conflict.message}
              />
            );
          })()}
        {resizePreview &&
          (() => {
            const conflict = previewConflict(
              resizePreview.log.id,
              resizePreview.previewStart,
              resizePreview.previewEnd
            );
            if (!conflict.invalid) return null;
            const style = blockStyle(
              resizePreview.previewStart,
              resizePreview.previewEnd,
              timezone
            );
            return (
              <div
                className="absolute left-0.5 right-0.5 z-20 rounded border border-destructive/70 ring-1 ring-destructive/25"
                style={{
                  top: style.top,
                  height: style.height,
                  minHeight: style.height === "0%" ? "0px" : "3px",
                  display: style.display
                }}
                title={conflict.message}
              />
            );
          })()}
        {activeTimer &&
          (() => {
            const timerStart = new Date(activeTimer.startedAt);
            const timerEnd = activeTimer.isPaused
              ? new Date(timerStart.getTime() + activeTimer.elapsedSec * 1000)
              : new Date();
            const clip = clipLogToDay(
              {
                id: "active-timer",
                startTime: timerStart.toISOString(),
                endTime: timerEnd.toISOString()
              } as TimeLogDto,
              day,
              timezone
            );
            if (!clip) return null;
            const style = blockStyle(clip.start, clip.end, timezone);
            const info = taskInfo(activeTimer.taskId);
            return (
              <div
                key="active-timer-live"
                className="pointer-events-none absolute left-0.5 right-0.5 z-20 overflow-hidden rounded-md border-2 border-emerald-500/80 bg-emerald-500/15 shadow-md ring-2 ring-emerald-500/20"
                style={{
                  top: style.top,
                  height: style.height,
                  minHeight: style.height === "0%" ? "0px" : "3px",
                  display: style.display
                }}
                title={`${info.taskName} — tracking now`}
              >
                <div className="h-full px-1.5 py-0.5">
                  <CalendarEntryContent
                    task={info}
                    durationSec={liveElapsedSec ?? activeTimer.elapsedSec}
                    compact={compact}
                    variant="live"
                    liveElapsedSec={liveElapsedSec ?? activeTimer.elapsedSec}
                  />
                </div>
              </div>
            );
          })()}
        {dayLogs.map(({ log, clip }) => {
          const isResizing = resizePreview?.log.id === log.id;
          const isDraggingCopy = isDuplicatingThis === log.id;
          const isDraggingMove = isMovingThis === log.id;
          const submissionLocked = isEntryLocked(log);
          const inactive = isEntryInactive(log);
          const locked = submissionLocked || inactive;
          const timer = isTimerEntry(log);
          const entryReadOnly = readOnly || locked || timer;
          const display = isResizing
            ? { start: resizePreview.previewStart, end: resizePreview.previewEnd }
            : clip;
          const style = blockStyle(display.start, display.end, timezone);
          const colors = inactive
            ? inactiveEntryColors()
            : entryColorsFromProject(entryColor(log.taskId));

          return (
            <div
              key={`${log.id}-${clip.start.toISOString()}`}
              className={cn(
                "pointer-events-auto absolute left-0.5 right-0.5 overflow-hidden rounded-md border shadow-sm",
                (isDraggingCopy || isDraggingMove) && "opacity-40",
                inactive && "opacity-90",
                submissionLocked &&
                  !inactive &&
                  "border-dashed border-muted-foreground/40 opacity-95",
                timer && !locked && "border-dotted border-muted-foreground/35"
              )}
              style={{
                top: style.top,
                height: style.height,
                minHeight: style.height === "0%" ? "0px" : "3px",
                display: style.display,
                ...colors
              }}
            >
              {!entryReadOnly && (
                <div
                  className="absolute inset-x-0 top-0 z-10 h-1.5 max-md:h-3 cursor-ns-resize bg-black/15"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onResizeStart(log, clip, "start");
                  }}
                />
              )}
              <button
                type="button"
                className={cn(
                  "relative z-10 h-full w-full px-1.5 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !isDraggingCopy &&
                    !isDraggingMove &&
                    !entryReadOnly &&
                    "cursor-grab hover:brightness-95 active:cursor-grabbing"
                )}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (entryReadOnly) return;
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
                  inactive
                    ? `${taskName(log.taskId)} — read-only (inactive project, category, or task)`
                    : submissionLocked
                      ? `${taskName(log.taskId)} — locked (submitted or approved)`
                      : timer
                        ? `${taskName(log.taskId)} — timer entry (view only)`
                        : readOnly
                          ? taskName(log.taskId)
                          : `${taskName(log.taskId)} — drag to move, Ctrl+drag to duplicate`
                }
              >
                <CalendarEntryContent
                  task={taskInfo(log.taskId)}
                  description={log.description}
                  durationSec={log.durationSec}
                  compact={compact}
                  variant={
                    inactive
                      ? "inactive"
                      : submissionLocked
                        ? "locked"
                        : timer
                          ? "timer"
                          : "default"
                  }
                />
              </button>
              {!entryReadOnly && (
                <div
                  className="absolute inset-x-0 bottom-0 z-10 h-1.5 max-md:h-3 cursor-ns-resize bg-black/15"
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
        <LiveIndicatorLine
          day={day}
          dayLogs={dayLogs}
          activeTimer={activeTimer}
          taskName={taskName}
          timezone={timezone}
        />
      </div>
    </div>
  );
}

function LiveIndicatorLine({
  day,
  dayLogs,
  activeTimer,
  taskName,
  timezone = "UTC"
}: {
  day: Date;
  dayLogs: { log: TimeLogDto; clip: { start: Date; end: Date } }[];
  activeTimer?: ActiveTimerDto | null;
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

  const timerOnDay = activeTimer && isSameDayInZone(new Date(activeTimer.startedAt), day, timezone);
  const currentDayLogs = dayLogs.filter(({ clip }) => now >= clip.start && now <= clip.end);
  const activeLog = currentDayLogs[0]?.log;
  const activeTaskName = timerOnDay
    ? taskName(activeTimer.taskId)
    : activeLog
      ? taskName(activeLog.taskId)
      : null;

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

function OccupancyElsewhereBand({
  segment,
  timezone
}: {
  segment: {
    workspaceName: string;
    label: string;
    start: Date;
    end: Date;
  };
  timezone: string;
}) {
  const style = blockStyle(segment.start, segment.end, timezone);
  const heightPct = parseFloat(style.height);
  const showLabel = Number.isFinite(heightPct) && heightPct >= 3.5;
  const timeRange = formatSegmentTimeRange(segment.start, segment.end, timezone);

  return (
    <div
      className="absolute inset-x-1 overflow-hidden rounded-sm border border-dashed border-muted-foreground/20 border-l-[3px] border-l-muted-foreground/35 bg-muted/10"
      style={{
        top: style.top,
        height: style.height,
        minHeight: style.height === "0%" ? "0px" : "3px",
        display: style.display
      }}
      title={`${segment.workspaceName}: ${segment.label} (${timeRange})`}
    >
      {showLabel && (
        <div className="flex h-full min-h-[3px] items-center gap-1 px-1.5">
          <Building2 className="h-2.5 w-2.5 shrink-0 text-muted-foreground/60" aria-hidden />
          <span className="truncate text-[10px] font-medium text-muted-foreground">
            {segment.workspaceName}
          </span>
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
  timezone = "UTC",
  invalid = false,
  invalidMessage
}: {
  preview: EntryPreview;
  taskName: (taskId: string) => string;
  entryColor: (taskId: string) => string;
  compact: boolean;
  variant: "move" | "duplicate";
  timezone?: string;
  invalid?: boolean;
  invalidMessage?: string;
}) {
  const style = blockStyle(preview.start, preview.end, timezone);
  const colors = entryColorsFromProject(entryColor(preview.log.taskId));
  return (
    <div
      className={cn(
        "absolute left-0.5 right-0.5 z-20 overflow-hidden rounded border-2 px-1 py-0.5 shadow-md",
        variant === "duplicate" && !invalid && "border-dashed opacity-70",
        invalid && "border-destructive/70 ring-1 ring-destructive/25"
      )}
      style={{
        top: style.top,
        height: style.height,
        minHeight: style.height === "0%" ? "0px" : "3px",
        display: style.display,
        ...colors,
        ...(variant === "move" && !invalid ? { opacity: 0.85 } : {}),
        ...(invalid ? { opacity: 0.9 } : {})
      }}
      title={invalid ? invalidMessage : undefined}
    >
      <span className={cn("block truncate font-medium", compact ? "text-[10px]" : "text-xs")}>
        {taskName(preview.log.taskId)}
      </span>
    </div>
  );
}
