"use client";

import { Skeleton } from "@kloqra/ui";
import dynamic from "next/dynamic";

function CardSkeleton() {
  return <Skeleton className="h-48 w-full rounded-lg" />;
}

export const SubmissionStatusCard = dynamic(
  () =>
    import("@/features/timesheet/submission-status-card").then((m) => ({
      default: m.SubmissionStatusCard
    })),
  { ssr: false, loading: () => <CardSkeleton /> }
);
