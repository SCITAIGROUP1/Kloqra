"use client";

import { AppBar, Card } from "@kloqra/ui";
import { Check, Clock } from "lucide-react";
import { useState } from "react";
import { PendingTimesheetCard } from "./pending-timesheet-card";
import { usePendingTimesheets } from "./use-pending-timesheets";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function ApprovalsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { pending, loading, actioningId, handleReview } = usePendingTimesheets(ws);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <AppBar
        title="Approvals"
        description="Review submitted timesheets and approve or reject them by project period."
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Clock className="size-8 animate-spin text-primary opacity-60" />
        </div>
      ) : pending.length === 0 ? (
        <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
          <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
          <p className="font-medium text-sm">All timesheets reviewed</p>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            You have no pending timesheet approvals left for this workspace.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((t) => (
            <PendingTimesheetCard
              key={t.id}
              item={t}
              workspaceId={ws}
              reviewNote={reviewNotes[t.id] || ""}
              onReviewNoteChange={(value) => setReviewNotes((prev) => ({ ...prev, [t.id]: value }))}
              onReview={(action) => {
                const note = reviewNotes[t.id] || "";
                void handleReview(t.id, action, note).then(() => {
                  setReviewNotes((prev) => {
                    const next = { ...prev };
                    delete next[t.id];
                    return next;
                  });
                });
              }}
              actioning={actioningId === t.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
