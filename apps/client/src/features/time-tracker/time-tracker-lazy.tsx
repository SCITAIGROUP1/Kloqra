"use client";

import { Skeleton } from "@kloqra/ui";
import dynamic from "next/dynamic";

export { TimeEntryDialog } from "../timesheet/timesheet-lazy";

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export const TimeTrackerWeekList = dynamic(
  () =>
    import("./time-tracker-week-list").then((m) => ({
      default: m.TimeTrackerWeekList
    })),
  { ssr: false, loading: () => <ListSkeleton /> }
);
