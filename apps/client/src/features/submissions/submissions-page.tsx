"use client";

import type { ProjectDto, TimesheetPeriodDto, UserProfileDto } from "@kloqra/contracts";
import { resolveEffectiveTimezone, ROUTES } from "@kloqra/contracts";
import {
  AppBar,
  AppBarSecondary,
  Card,
  LoadingCrossfade,
  MotionReveal,
  SegmentedControl
} from "@kloqra/ui";
import {
  fetchListItems,
  parseMemberSubmissionsSearch,
  resolveMemberSubmissionsTab,
  type MemberSubmissionsTab
} from "@kloqra/web-shared";
import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SubmissionsFiltersBar } from "./submissions-filters-bar";
import { SubmissionsTable } from "./submissions-table";
import {
  countActionableSubmissions,
  countPendingReviewSubmissions,
  filterSubmissionsByPeriodRange,
  filterSubmissionsByTab
} from "./use-my-submissions";
import { todayInZone } from "@/features/timesheet/calendar-utils";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const TAB_OPTIONS: { value: MemberSubmissionsTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "action", label: "Action needed" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" }
];

function emptyStateCopy(
  tab: MemberSubmissionsTab,
  hasActiveFilters: boolean
): { title: string; detail: string } {
  if (hasActiveFilters) {
    return {
      title: "No matching submissions",
      detail: "Try clearing filters or choosing a different period."
    };
  }
  switch (tab) {
    case "action":
      return {
        title: "Nothing to submit",
        detail: "You're caught up for this period."
      };
    case "pending":
      return {
        title: "No timesheets waiting for approval",
        detail: "Submitted timesheets will appear here until reviewed."
      };
    case "approved":
      return {
        title: "No approved timesheets",
        detail: "Approved submissions for this period will appear here."
      };
    case "all":
    default:
      return {
        title: "No submissions found",
        detail: "Timesheets for approval-enabled projects will appear here."
      };
  }
}

export function SubmissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLink = useMemo(
    () => parseMemberSubmissionsSearch(searchParams.toString()),
    [searchParams]
  );
  const tab = resolveMemberSubmissionsTab(deepLink);
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { projects, setProjects } = useProjectsStore();
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [weekStartPref, setWeekStartPref] = useState<"monday" | "sunday">("monday");
  const [allSubmissions, setAllSubmissions] = useState<TimesheetPeriodDto[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);

  const [timezone, setTimezone] = useState(() =>
    resolveEffectiveTimezone({}, Intl.DateTimeFormat().resolvedOptions().timeZone)
  );

  useEffect(() => {
    if (!deepLink.periodStart) return;
    const periodStart = new Date(deepLink.periodStart);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 6);
    setRangeFrom(periodStart.toISOString().slice(0, 10));
    setRangeTo(periodEnd.toISOString().slice(0, 10));
  }, [deepLink.periodStart]);

  useEffect(() => {
    if (!deepLink.projectId) return;
    setProjectFilter([deepLink.projectId]);
  }, [deepLink.projectId]);

  useEffect(() => {
    if (!deepLink.projectId) return;
    const el = document.getElementById(`submission-row-${deepLink.projectId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [deepLink.projectId, deepLink.highlight, tab]);

  useEffect(() => {
    if (!ws) return;
    void api<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws }).then((profile) => {
      const pref = profile.preferences?.weekStart;
      if (pref === "monday" || pref === "sunday") {
        setWeekStartPref(pref);
      }
      setTimezone(
        resolveEffectiveTimezone(
          profile.preferences ?? {},
          Intl.DateTimeFormat().resolvedOptions().timeZone
        )
      );
    });
  }, [ws]);

  useEffect(() => {
    if (!ws) return;
    if (projects.length > 0) return;
    void fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
  }, [ws, projects.length, setProjects]);

  const setTab = useCallback(
    (next: MemberSubmissionsTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("tab");
      else params.set("tab", next);
      const q = params.toString();
      router.replace(q ? `/submissions?${q}` : "/submissions");
    },
    [router, searchParams]
  );

  const refreshAll = useCallback(async () => {
    if (!ws) return;
    const anchor = todayInZone(timezone);
    const params = new URLSearchParams({
      date: anchor.toISOString(),
      scope: "assigned",
      lookbackWeeks: "26"
    });
    const res = await api<{ items: TimesheetPeriodDto[] }>(
      `${ROUTES.TIMESHEETS.MY_SUBMISSIONS}?${params.toString()}`,
      { workspaceId: ws }
    );
    const items = res.items ?? [];
    setAllSubmissions(
      [...items].sort(
        (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      )
    );
  }, [ws, timezone]);

  useEffect(() => {
    if (!ws) return;
    setAllLoading(true);
    void refreshAll().finally(() => setAllLoading(false));
  }, [ws, refreshAll]);

  const handleSubmitted = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  const periodFilteredSubmissions = useMemo(
    () => filterSubmissionsByPeriodRange(allSubmissions, rangeFrom, rangeTo),
    [allSubmissions, rangeFrom, rangeTo]
  );

  const tabFilteredSubmissions = useMemo(
    () => filterSubmissionsByTab(periodFilteredSubmissions, tab),
    [periodFilteredSubmissions, tab]
  );

  const filteredSubmissions = useMemo(() => {
    return tabFilteredSubmissions.filter((row) => {
      if (projectFilter.length > 0 && !projectFilter.includes(row.projectId)) return false;
      return true;
    });
  }, [tabFilteredSubmissions, projectFilter]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of periodFilteredSubmissions) {
      map.set(row.projectId, row.projectName ?? "Project");
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [periodFilteredSubmissions]);

  const hasActiveFilters = projectFilter.length > 0 || rangeFrom.length > 0 || rangeTo.length > 0;

  const clearFilters = useCallback(() => {
    setProjectFilter([]);
    setRangeFrom("");
    setRangeTo("");
  }, []);

  const handleRangeChange = useCallback((from: string, to: string) => {
    setRangeFrom(from);
    setRangeTo(to);
  }, []);

  const actionCount = countActionableSubmissions(periodFilteredSubmissions);
  const pendingCount = countPendingReviewSubmissions(periodFilteredSubmissions);
  const approvedCount = periodFilteredSubmissions.filter((s) => s.status === "APPROVED").length;

  const tabOptions = TAB_OPTIONS.map((opt) => {
    if (opt.value === "action" && actionCount > 0) {
      return { ...opt, label: `Action needed (${actionCount})` };
    }
    if (opt.value === "pending" && pendingCount > 0) {
      return { ...opt, label: `Pending review (${pendingCount})` };
    }
    if (opt.value === "approved" && approvedCount > 0) {
      return { ...opt, label: `Approved (${approvedCount})` };
    }
    return opt;
  });

  const emptyCopy = emptyStateCopy(tab, hasActiveFilters);
  const weekStartsOn = weekStartPref === "sunday" ? 0 : 1;

  return (
    <div className="space-y-6">
      <AppBar
        title="Submissions"
        description="Submit timesheets for review and track status by project."
        secondary={
          <AppBarSecondary
            trailing={<SegmentedControl value={tab} onChange={setTab} options={tabOptions} />}
          />
        }
      />

      <MotionReveal>
        <SubmissionsFiltersBar
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          onRangeChange={handleRangeChange}
          weekStartsOn={weekStartsOn}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          projectOptions={projectOptions}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          resultCount={filteredSubmissions.length}
        />
      </MotionReveal>

      <LoadingCrossfade loading={allLoading} loaderLabel="Loading submissions…">
        {filteredSubmissions.length === 0 ? (
          <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
            <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
            <p className="font-medium text-sm">{emptyCopy.title}</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">{emptyCopy.detail}</p>
          </Card>
        ) : (
          <SubmissionsTable
            submissions={filteredSubmissions}
            projects={projects}
            onSubmitted={handleSubmitted}
            highlightedProjectId={deepLink.projectId}
          />
        )}
      </LoadingCrossfade>
    </div>
  );
}
