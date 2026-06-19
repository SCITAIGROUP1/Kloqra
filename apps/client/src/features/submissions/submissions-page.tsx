"use client";

import type { TimesheetPeriodDto, UserProfileDto } from "@kloqra/contracts";
import { resolveEffectiveTimezone, ROUTES } from "@kloqra/contracts";
import {
  AppBar,
  Button,
  Input,
  LoadingCrossfade,
  MotionReveal,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { parseMemberSubmissionsSearch } from "@kloqra/web-shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SubmissionStatusCard } from "./submissions-lazy";
import { SubmissionsTable } from "./submissions-table";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLink = useMemo(
    () => parseMemberSubmissionsSearch(searchParams.toString()),
    [searchParams]
  );
  const view = deepLink.view ?? "cards";
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [periodMode, setPeriodMode] = useState<"week" | "all">("week");
  const [weekStartPref, setWeekStartPref] = useState<"monday" | "sunday">("monday");
  const [anchor, setAnchor] = useState(() => new Date());
  const [allSubmissions, setAllSubmissions] = useState<TimesheetPeriodDto[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (deepLink.periodStart) {
      setAnchor(new Date(deepLink.periodStart));
    }
  }, [deepLink.periodStart]);

  useEffect(() => {
    if (!deepLink.projectId) return;
    const el =
      document.getElementById(`submission-row-${deepLink.projectId}`) ??
      document.getElementById(`submission-${deepLink.projectId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [deepLink.projectId, deepLink.highlight, view]);

  useEffect(() => {
    if (!ws) return;
    void api<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws }).then((profile) => {
      const pref = profile.preferences?.weekStart;
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

  const setView = useCallback(
    (next: "cards" | "table") => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "cards") params.delete("view");
      else params.set("view", next);
      const q = params.toString();
      router.replace(q ? `/submissions?${q}` : "/submissions");
    },
    [router, searchParams]
  );

  const refreshAll = useCallback(async () => {
    if (!ws) return;
    const weeks = 26;
    const starts = Array.from({ length: weeks }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i * 7);
      return startOfWeekWithPreference(d, weekStartPref);
    });
    const batches = await Promise.all(
      starts.map((date) => {
        const params = new URLSearchParams({
          date: date.toISOString(),
          scope: "assigned"
        });
        return api<{ items: TimesheetPeriodDto[] }>(
          `${ROUTES.TIMESHEETS.MY_SUBMISSIONS}?${params.toString()}`,
          { workspaceId: ws }
        ).then((res) => res.items ?? []);
      })
    );
    const byKey = new Map<string, TimesheetPeriodDto>();
    for (const row of batches.flat()) {
      byKey.set(`${row.projectId}:${row.periodStart}`, row);
    }
    setAllSubmissions(
      [...byKey.values()].sort(
        (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      )
    );
  }, [ws, anchor, weekStartPref]);

  useEffect(() => {
    if (periodMode !== "all" || !ws) return;
    setAllLoading(true);
    void refreshAll().finally(() => setAllLoading(false));
  }, [periodMode, ws, refreshAll]);

  const handleSubmitted = useCallback(async () => {
    await refresh();
    if (periodMode === "all") {
      await refreshAll();
    }
  }, [refresh, periodMode, refreshAll]);

  const activeSubmissions = useMemo(
    () => (periodMode === "all" ? allSubmissions : submissions),
    [periodMode, allSubmissions, submissions]
  );

  const filteredSubmissions = useMemo(() => {
    return activeSubmissions.filter((row) => {
      if (projectFilter !== "all" && row.projectId !== projectFilter) return false;
      if (statusFilter === "edit_pending" && !row.amendmentPending) return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "edit_pending" &&
        row.status.toLowerCase() !== statusFilter
      ) {
        return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        if (!(row.projectName ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [activeSubmissions, projectFilter, statusFilter, searchText]);

  const readyCount = countActionableSubmissions(filteredSubmissions);
  const pendingCount = countPendingReviewSubmissions(filteredSubmissions);
  const amendmentPendingCount = countAmendmentPendingSubmissions(filteredSubmissions);
  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of activeSubmissions) {
      map.set(row.projectId, row.projectName ?? "Project");
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [activeSubmissions]);

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
            <SegmentedControl
              value={periodMode}
              onChange={setPeriodMode}
              options={[
                { value: "week", label: "Current week" },
                { value: "all", label: "All recent" }
              ]}
            />
            {periodMode === "week" ? (
              <>
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
              </>
            ) : (
              <span className="text-sm font-medium">Last 26 weeks</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search project"
              className="h-8 w-[180px]"
            />
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projectOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Pending review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="edit_pending">Edit pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {summaryParts.length > 0 ? summaryParts.join(" · ") : "All caught up for this period"}
            </p>
            {periodMode === "week" ? (
              <SegmentedControl
                value={view}
                onChange={setView}
                options={[
                  { value: "cards", label: "Cards" },
                  { value: "table", label: "Table" }
                ]}
              />
            ) : null}
          </div>
        </div>
      </MotionReveal>

      <LoadingCrossfade
        loading={periodMode === "all" ? allLoading : loading}
        loaderLabel="Loading submissions…"
      >
        {filteredSubmissions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium">No matching submissions</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Try clearing filters or switching period mode.
            </p>
          </div>
        ) : periodMode === "all" || view === "table" ? (
          <SubmissionsTable
            submissions={filteredSubmissions}
            onSubmitted={handleSubmitted}
            highlightedProjectId={deepLink.projectId}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in motion-reduce:animate-none">
            {filteredSubmissions.map((sub) => {
              const highlighted =
                deepLink.projectId === sub.projectId && Boolean(deepLink.highlight);
              return (
                <div key={`${sub.projectId}:${sub.periodStart}`}>
                  <SubmissionStatusCard
                    statusInfo={sub}
                    onSubmitted={handleSubmitted}
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
