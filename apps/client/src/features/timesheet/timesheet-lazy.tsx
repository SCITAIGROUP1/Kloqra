"use client";

import { Skeleton } from "@kloqra/ui";
import dynamic from "next/dynamic";

function TimesheetSkeleton({
  className = "min-h-[420px]",
  style
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <Skeleton style={style} className={`w-full rounded-lg ${className}`} />;
}

export const TimesheetCalendar = dynamic(
  () =>
    import("./timesheet-calendar").then((m) => ({
      default: m.TimesheetCalendar
    })),
  { ssr: false, loading: () => <TimesheetSkeleton className="min-h-[480px]" /> }
);

export const TimesheetMonth = dynamic(
  () =>
    import("./timesheet-month").then((m) => ({
      default: m.TimesheetMonth
    })),
  { ssr: false, loading: () => <TimesheetSkeleton className="min-h-[360px]" /> }
);

export const TimeEntryDialog = dynamic(
  () =>
    import("./time-entry-dialog").then((m) => ({
      default: m.TimeEntryDialog
    })),
  { ssr: false, loading: () => null }
);
