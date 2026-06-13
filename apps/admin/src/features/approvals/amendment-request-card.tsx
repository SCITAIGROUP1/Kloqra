"use client";

import type { TimesheetAmendmentDto } from "@kloqra/contracts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, cn } from "@kloqra/ui";
import { Calendar, Check, MessageSquare, X } from "lucide-react";

export type AmendmentRequestCardProps = {
  item: TimesheetAmendmentDto;
  reviewNote: string;
  onReviewNoteChange: (value: string) => void;
  onReview: (action: "approve" | "deny") => void;
  actioning: boolean;
  highlighted?: boolean;
};

export function AmendmentRequestCard({
  item,
  reviewNote,
  onReviewNoteChange,
  onReview,
  actioning,
  highlighted = false
}: AmendmentRequestCardProps) {
  return (
    <Card
      id={`amendment-${item.id}`}
      interactive
      className={cn(
        "border-primary/10",
        highlighted &&
          "ring-2 ring-primary/40 ring-offset-2 ring-offset-background animate-highlight-pulse"
      )}
    >
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold">{item.userName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{item.userEmail}</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Edit request
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="size-4 text-muted-foreground" />
          <span>
            {item.projectName} · {item.periodLabel}
          </span>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed flex gap-2">
          <MessageSquare className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
          <div>
            <span className="font-semibold text-muted-foreground block mb-0.5">Reason</span>
            <span className="text-foreground">{item.reason}</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Requested {new Date(item.createdAt).toLocaleString()}
        </p>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label
              htmlFor={`amendment-note-${item.id}`}
              className="text-xs text-muted-foreground font-medium"
            >
              Admin note (optional, shown if denied)
            </label>
            <Input
              id={`amendment-note-${item.id}`}
              placeholder="Optional note for the member"
              value={reviewNote}
              onChange={(e) => onReviewNoteChange(e.target.value)}
              className="text-xs h-8"
              disabled={actioning}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-1/2 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onReview("deny")}
              disabled={actioning}
            >
              <X className="size-3.5 mr-1" />
              Deny
            </Button>
            <Button
              size="sm"
              className="w-1/2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onReview("approve")}
              disabled={actioning}
            >
              <Check className="size-3.5 mr-1" />
              Approve unlock
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
