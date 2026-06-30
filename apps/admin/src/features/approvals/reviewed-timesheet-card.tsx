"use client";

import type { ReviewedTimesheetDto } from "@kloqra/contracts";
import { Badge, Card, CardContent, CardHeader, CardTitle, cn } from "@kloqra/ui";
import { Calendar, MessageSquare } from "lucide-react";
import { PendingActivity } from "./pending-timesheet-card";

function formatDateRange(startStr: string, endStr: string) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}

function periodHeading(t: ReviewedTimesheetDto) {
  const label =
    t.approvalPeriod === "daily" ? "Day" : t.approvalPeriod === "monthly" ? "Month" : "Week";
  return `${t.projectName} · ${label}: ${formatDateRange(t.periodStart, t.periodEnd)}`;
}

export interface ReviewedTimesheetCardProps {
  item: ReviewedTimesheetDto;
  workspaceId: string;
  highlighted?: boolean;
  timezone?: string;
}

export function ReviewedTimesheetCard({
  item,
  workspaceId,
  highlighted = false,
  timezone
}: ReviewedTimesheetCardProps) {
  const batchLabel =
    item.cascadedCount && item.cascadedCount > 0
      ? `Part of batch submit (+${item.cascadedCount})`
      : null;
  const reviewedLabel = new Date(item.reviewedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timezone ? { timeZone: timezone } : {})
  });

  return (
    <Card
      id={`reviewed-${item.id}`}
      className={cn(
        "border-border/60 flex flex-col justify-between",
        highlighted &&
          "ring-2 ring-primary/40 ring-offset-2 ring-offset-background animate-highlight-pulse"
      )}
    >
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-bold text-primary">{item.userName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{item.userEmail}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge
              variant="secondary"
              className="font-mono text-xs px-2.5 py-0.5 bg-primary/10 text-primary"
            >
              {item.totalHours} hrs
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                item.status === "APPROVED"
                  ? "border-status-success-border text-status-success-fg bg-status-success-bg"
                  : "border-status-danger-border text-status-danger-fg bg-status-danger-bg"
              )}
            >
              {item.status === "APPROVED" ? "Approved" : "Rejected"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="size-4 text-muted-foreground" />
            <span>{periodHeading(item)}</span>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 font-medium">
            <div>
              <span className="text-muted-foreground/75">
                {item.status === "APPROVED" ? "Date Approved: " : "Date Rejected: "}
              </span>
              <span className="text-foreground">{reviewedLabel}</span>
            </div>
            {item.reviewedByName ? (
              <div>
                <span className="text-muted-foreground/75">
                  {item.status === "APPROVED" ? "Approved By: " : "Rejected By: "}
                </span>
                <span className="text-foreground font-semibold">{item.reviewedByName}</span>
              </div>
            ) : null}
          </div>

          {batchLabel ? (
            <Badge variant="outline" className="text-[10px] w-fit">
              {batchLabel}
            </Badge>
          ) : null}

          {item.note ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed flex gap-2">
              <MessageSquare className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <span className="font-semibold text-muted-foreground block mb-0.5">
                  Submission Note
                </span>
                <span className="text-foreground">{item.note}</span>
              </div>
            </div>
          ) : null}

          {item.reviewNote ? (
            <div className="rounded-lg border border-border/60 bg-background p-3 text-xs leading-relaxed flex gap-2">
              <MessageSquare className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <span className="font-semibold text-muted-foreground block mb-0.5">
                  Review Comment
                </span>
                <span className="text-foreground">{item.reviewNote}</span>
              </div>
            </div>
          ) : null}

          <PendingActivity item={item} workspaceId={workspaceId} timezone={timezone} />
        </div>
      </CardContent>
    </Card>
  );
}
