"use client";

import type { TimesheetAmendmentDto } from "@kloqra/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  ConfirmNoteDialog,
  cn
} from "@kloqra/ui";
import { Calendar, Check, MessageSquare, X } from "lucide-react";
import { useState } from "react";

export type AmendmentRequestCardProps = {
  item: TimesheetAmendmentDto;
  onReview: (action: "approve" | "deny", adminNote: string) => void;
  actioning: boolean;
  highlighted?: boolean;
};

export function AmendmentRequestCard({
  item,
  onReview,
  actioning,
  highlighted = false
}: AmendmentRequestCardProps) {
  const [confirmAction, setConfirmAction] = useState<"approve" | "deny" | null>(null);

  function closeDialog() {
    setConfirmAction(null);
  }

  return (
    <>
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

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-1/2 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmAction("deny")}
              disabled={actioning}
            >
              <X className="size-3.5 mr-1" />
              Deny
            </Button>
            <Button
              size="sm"
              className="w-1/2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setConfirmAction("approve")}
              disabled={actioning}
            >
              <Check className="size-3.5 mr-1" />
              Approve unlock
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAction === "approve"}
        title="Approve edit request?"
        description={`Unlock ${item.projectName} for ${item.userName} so they can edit entries in this period.`}
        confirmLabel="Approve unlock"
        onConfirm={() => {
          onReview("approve", "");
          closeDialog();
        }}
        onCancel={closeDialog}
      />

      <ConfirmNoteDialog
        open={confirmAction === "deny"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title="Deny edit request?"
        description={`Keep this period locked and let ${item.userName} know why the request was denied.`}
        noteLabel="Admin note"
        notePlaceholder="Optional note for the member"
        noteRequired
        destructive
        confirmLabel="Deny request"
        submitting={actioning}
        onConfirm={(note) => {
          onReview("deny", note);
          closeDialog();
        }}
      />
    </>
  );
}
