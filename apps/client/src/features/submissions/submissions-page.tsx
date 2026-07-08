"use client";

import {
  AppBar,
  AppBarSecondary,
  Card,
  LoadingCrossfade,
  MotionReveal,
  SegmentedControl,
  TablePagination
} from "@kloqra/ui";
import {
  APPROVALS_TABLE_PAGE_SIZE,
  parseMemberSubmissionsSearch,
  resolveMemberSubmissionsTab,
  SUBMISSIONS_LOOKBACK_WEEKS,
  todayInZone,
  toDateKeyInZone,
  useClientTablePagination,
  useDisplayPreferences,
  useEntryCatalogQueries,
  useMySubmissionsLookbackQuery,
  useWorkspaceStaleRefetch,
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
  filterSubmissionsByTab,
  type MemberSubmissionsTabFilter
} from "./use-my-submissions";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const TAB_OPTIONS: { value: MemberSubmissionsTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "action", label: "Action needed" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
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
    case "rejected":
      return {
        title: "No rejected timesheets",
        detail: "Timesheets rejected by admins will appear here."
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
  const catalog = useEntryCatalogQueries(ws, { enabled: Boolean(ws) });
  const projects = catalog.projects;
  const tasks = catalog.tasks;

  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [projectFilter, setProjectFilter] = useState<string[]>([]);

  const { timezone, weekStart: weekStartPref } = useDisplayPreferences();
  const anchorDateKey = useMemo(() => toDateKeyInZone(todayInZone(timezone), timezone), [timezone]);
  const {
    data: allSubmissions = [],
    isLoading: allLoading,
    refetch: refreshAll
  } = useMySubmissionsLookbackQuery(
    ws,
    anchorDateKey,
    SUBMISSIONS_LOOKBACK_WEEKS,
    "assigned",
    Boolean(ws)
  );

  useEffect(() => {
    if (!deepLink.periodStart) return;
    const periodStartKey = deepLink.periodStart.slice(0, 10);
    const periodEnd = new Date(`${periodStartKey}T12:00:00`);
    periodEnd.setDate(periodEnd.getDate() + 6);
    setRangeFrom(periodStartKey);
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

  const handleSubmitted = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  // Remote approval/submit events — skip during local timelog mutation echo window.
  useWorkspaceStaleRefetch(
    ws,
    ["submissions", "timesheet"],
    () => {
      void refreshAll();
    },
    Boolean(ws)
  );

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

  const periodFilteredSubmissions = useMemo(
    () =>
      filterSubmissionsByPeriodRange(
        [...allSubmissions].sort(
          (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
        ),
        rangeFrom,
        rangeTo
      ),
    [allSubmissions, rangeFrom, rangeTo]
  );

  const tabFilteredSubmissions = useMemo(
    () => filterSubmissionsByTab(periodFilteredSubmissions, tab as MemberSubmissionsTabFilter),
    [periodFilteredSubmissions, tab]
  );

  const filteredSubmissions = useMemo(() => {
    return tabFilteredSubmissions.filter((row) => {
      if (projectFilter.length > 0 && !projectFilter.includes(row.projectId)) return false;
      return true;
    });
  }, [tabFilteredSubmissions, projectFilter]);

  const {
    page,
    setPage,
    setLimit,
    pageItems,
    total: filteredTotal,
    totalPages,
    limit
  } = useClientTablePagination(filteredSubmissions, APPROVALS_TABLE_PAGE_SIZE);

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
  const rejectedCount = periodFilteredSubmissions.filter((s) => s.status === "REJECTED").length;

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
    if (opt.value === "rejected" && rejectedCount > 0) {
      return { ...opt, label: `Rejected (${rejectedCount})` };
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
          resultCount={filteredTotal}
        />
      </MotionReveal>

      <LoadingCrossfade loading={allLoading} loaderLabel="Loading submissions…">
        {filteredTotal === 0 ? (
          <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
            <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
            <p className="font-medium text-sm">{emptyCopy.title}</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">{emptyCopy.detail}</p>
          </Card>
        ) : (
          <>
            <SubmissionsTable
              submissions={pageItems}
              projects={projects}
              tasks={tasks}
              onSubmitted={handleSubmitted}
              highlightedProjectId={deepLink.projectId}
              workspaceId={ws}
              timezone={timezone}
            />
            <div className="mt-4">
              <TablePagination
                page={page}
                totalPages={totalPages}
                total={filteredTotal}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </div>
          </>
        )}
      </LoadingCrossfade>
    </div>
  );
}
