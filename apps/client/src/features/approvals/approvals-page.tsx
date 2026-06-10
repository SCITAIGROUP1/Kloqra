"use client";

import type { UserProfileDto } from "@kloqra/contracts";
import { resolveEffectiveTimezone, ROUTES } from "@kloqra/contracts";
import { AppBar, Button, CenteredLoader } from "@kloqra/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  countActionableSubmissions,
  countPendingReviewSubmissions,
  useMySubmissions
} from "./use-my-submissions";
import {
  addDays,
  formatWeekRange,
  startOfWeekWithPreference,
  todayInZone
} from "@/features/timesheet/calendar-utils";
import { TimesheetStatusCard } from "@/features/timesheet/timesheet-status-card";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function ApprovalsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [weekStartPref, setWeekStartPref] = useState<"monday" | "sunday">("monday");
  const [anchor, setAnchor] = useState(() => new Date());

  useEffect(() => {
    if (!ws) return;
    void api<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws }).then((profile) => {
      const pref = profile.preferences?.weekStartsOn;
      if (pref === "monday" || pref === "sunday") {
        setWeekStartPref(pref);
      }
    });
  }, [ws]);

  const [timezone, setTimezone] = useState(() =>
    resolveEffectiveTimezone({}, Intl.DateTimeFormat().resolvedOptions().timeZone)
  );

  useEffect(() => {
    if (!ws) return;
    void api<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws }).then((profile) => {
      setTimezone(
        resolveEffectiveTimezone(
          profile.preferences ?? {},
          Intl.DateTimeFormat().resolvedOptions().timeZone
        )
      );
    });
  }, [ws]);

  useEffect(() => {
    setAnchor(todayInZone(timezone));
  }, [timezone]);

  const weekStart = useMemo(
    () => startOfWeekWithPreference(anchor, weekStartPref),
    [anchor, weekStartPref]
  );

  const { submissions, loading, refresh } = useMySubmissions(ws, anchor, "assigned");

  const goPrev = useCallback(() => setAnchor((d) => addDays(d, -7)), []);
  const goNext = useCallback(() => setAnchor((d) => addDays(d, 7)), []);
  const goToday = useCallback(() => setAnchor(todayInZone(timezone)), [timezone]);

  const readyCount = countActionableSubmissions(submissions);
  const pendingCount = countPendingReviewSubmissions(submissions);

  return (
    <div className="space-y-6">
      <AppBar
        title="Approvals"
        description="Send your timesheets for review and track approval status by project."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goPrev}
            >
              ‹
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goNext}
            >
              ›
            </Button>
          </div>
          <span className="text-sm font-medium">{formatWeekRange(weekStart)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {readyCount > 0 && <span>{readyCount} ready to send</span>}
          {readyCount > 0 && pendingCount > 0 && <span> · </span>}
          {pendingCount > 0 && <span>{pendingCount} pending review</span>}
          {readyCount === 0 && pendingCount === 0 && <span>All caught up for this period</span>}
        </p>
      </div>

      {loading ? (
        <CenteredLoader label="Loading submissions…" />
      ) : submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">No approval-required projects</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Projects with timesheet approval enabled will appear here when you are on the project
            team.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {submissions.map((sub) => (
            <TimesheetStatusCard
              key={`${sub.projectId}:${sub.periodStart}`}
              statusInfo={sub}
              onSubmitted={refresh}
              anchorDate={anchor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
