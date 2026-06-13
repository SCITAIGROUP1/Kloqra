"use client";

import type { UserProfileDto } from "@kloqra/contracts";
import { resolveEffectiveTimezone, ROUTES } from "@kloqra/contracts";
import { AppBar, Button, LoadingCrossfade, MotionReveal } from "@kloqra/ui";
import { parseMemberSubmissionsSearch } from "@kloqra/web-shared";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SubmissionStatusCard } from "./submissions-lazy";
import {
  countActionableSubmissions,
  countAmendmentPendingSubmissions,
  countPendingReviewSubmissions,
  useMySubmissions
} from "./use-my-submissions";
import {
  addDays,
  formatWeekRange,
  startOfWeekWithPreference,
  todayInZone
} from "@/features/timesheet/calendar-utils";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function SubmissionsPage() {
  const searchParams = useSearchParams();
  const deepLink = useMemo(
    () => parseMemberSubmissionsSearch(searchParams.toString()),
    [searchParams]
  );
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [weekStartPref, setWeekStartPref] = useState<"monday" | "sunday">("monday");
  const [anchor, setAnchor] = useState(() => new Date());
  const focusedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (deepLink.periodStart) {
      setAnchor(new Date(deepLink.periodStart));
    }
  }, [deepLink.periodStart]);

  useEffect(() => {
    if (!deepLink.projectId || !focusedRef.current) return;
    focusedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [deepLink.projectId, deepLink.highlight]);

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
    if (!deepLink.periodStart) {
      setAnchor(todayInZone(timezone));
    }
  }, [timezone, deepLink.periodStart]);

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
  const amendmentPendingCount = countAmendmentPendingSubmissions(submissions);

  const summaryParts: string[] = [];
  if (readyCount > 0) summaryParts.push(`${readyCount} ready to submit`);
  if (pendingCount > 0) summaryParts.push(`${pendingCount} pending review`);
  if (amendmentPendingCount > 0) {
    summaryParts.push(
      `${amendmentPendingCount} edit request${amendmentPendingCount === 1 ? "" : "s"} pending`
    );
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Submissions"
        description="Submit timesheets for review and track status by project."
      />

      <MotionReveal>
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
            {summaryParts.length > 0 ? summaryParts.join(" · ") : "All caught up for this period"}
          </p>
        </div>
      </MotionReveal>

      <LoadingCrossfade loading={loading} loaderLabel="Loading submissions…">
        {submissions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium">No submission-required projects</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Projects with timesheet approval enabled will appear here when you are on the project
              team.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in motion-reduce:animate-none">
            {submissions.map((sub) => {
              const highlighted =
                deepLink.projectId === sub.projectId && Boolean(deepLink.highlight);
              return (
                <div
                  key={`${sub.projectId}:${sub.periodStart}`}
                  ref={deepLink.projectId === sub.projectId ? focusedRef : undefined}
                >
                  <SubmissionStatusCard
                    statusInfo={sub}
                    onSubmitted={refresh}
                    anchorDate={anchor}
                    highlighted={highlighted}
                  />
                </div>
              );
            })}
          </div>
        )}
      </LoadingCrossfade>
    </div>
  );
}
