"use client";

import { ROUTES, type MissingTimesheetDto } from "@kloqra/contracts";
import {
  AppBar,
  AppBarSecondary,
  Badge,
  Button,
  Card,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  DismissableList,
  LoadingCrossfade,
  SegmentedControl,
  Table,
  TableBody,
  TableHeader,
  TableRow
} from "@kloqra/ui";
import { parseAdminApprovalsSearch, hasActiveApprovalsFilter } from "@kloqra/web-shared";
import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AmendmentRequestCard } from "./amendment-request-card";
import { ApprovalsFiltersBar } from "./approvals-filters-bar";
import { PendingTimesheetCard } from "./pending-timesheet-card";
import { RemindMemberDialog } from "./remind-member-dialog";
import { ReviewedTimesheetCard } from "./reviewed-timesheet-card";
import { useApprovalsFilterOptions } from "./use-approvals-filter-options";
import { useApprovalsFilters } from "./use-approvals-filters";
import { useMissingTimesheets } from "./use-missing-timesheets";
import { usePendingAmendments } from "./use-pending-amendments";
import { usePendingTimesheets } from "./use-pending-timesheets";
import { useReviewedTimesheets } from "./use-reviewed-timesheets";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

type ApprovalsTab = "review" | "missing" | "amendments" | "approved" | "rejected";

const TAB_OPTIONS: { value: ApprovalsTab; label: string }[] = [
  { value: "review", label: "Pending review" },
  { value: "missing", label: "Missing" },
  { value: "amendments", label: "Amendments" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

function remindedToday(lastRemindedAt: string | null): boolean {
  if (!lastRemindedAt) return false;
  const reminded = new Date(lastRemindedAt);
  const now = new Date();
  return (
    reminded.getFullYear() === now.getFullYear() &&
    reminded.getMonth() === now.getMonth() &&
    reminded.getDate() === now.getDate()
  );
}

export function ApprovalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const deepLink = useMemo(() => parseAdminApprovalsSearch(search), [search]);
  const tab: ApprovalsTab = deepLink.tab ?? "review";
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { filters, setFilters, clearFilters } = useApprovalsFilters();
  const {
    projectOptions,
    memberOptions,
    loading: filterOptionsLoading
  } = useApprovalsFilterOptions(ws, Boolean(ws));
  const [anchorDate] = useState(() => new Date());
  const [remindTarget, setRemindTarget] = useState<MissingTimesheetDto | null>(null);
  const [reminding, setReminding] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);

  const { pending, loading, actioningId, handleReview, fetchPending } = usePendingTimesheets(
    ws,
    filters,
    tab === "review"
  );
  const {
    missing,
    loading: missingLoading,
    refresh: refreshMissing
  } = useMissingTimesheets(ws, anchorDate, filters, tab === "missing");
  const {
    amendments,
    loading: amendmentsLoading,
    actioningId: amendmentActioningId,
    handleReview: handleAmendmentReview
  } = usePendingAmendments(ws, filters, tab === "amendments");
  const { items: approved, loading: approvedLoading } = useReviewedTimesheets(
    ws,
    "APPROVED",
    filters,
    tab === "approved"
  );
  const { items: rejected, loading: rejectedLoading } = useReviewedTimesheets(
    ws,
    "REJECTED",
    filters,
    tab === "rejected"
  );

  const setTab = useCallback(
    (next: ApprovalsTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`/approvals?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (!focusRef.current) return;
    focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [deepLink.periodId, deepLink.amendmentId, tab]);

  async function sendReminder(message: string) {
    if (!ws || !remindTarget) return;
    setReminding(true);
    try {
      await api(ROUTES.TIMESHEETS.REMIND, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          userId: remindTarget.userId,
          projectId: remindTarget.projectId,
          date: remindTarget.periodStart,
          message: message || undefined
        })
      });
      toast.success("Reminder sent");
      setRemindTarget(null);
      await refreshMissing();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reminder");
    } finally {
      setReminding(false);
    }
  }

  const tabOptions = TAB_OPTIONS.map((opt) => {
    if (opt.value === "review" && pending.length > 0) {
      return { ...opt, label: `Pending review (${pending.length})` };
    }
    if (opt.value === "missing" && missing.length > 0) {
      return { ...opt, label: `Missing (${missing.length})` };
    }
    if (opt.value === "amendments" && amendments.length > 0) {
      return { ...opt, label: `Amendments (${amendments.length})` };
    }
    if (opt.value === "approved" && approved.length > 0) {
      return { ...opt, label: `Approved (${approved.length})` };
    }
    if (opt.value === "rejected" && rejected.length > 0) {
      return { ...opt, label: `Rejected (${rejected.length})` };
    }
    return opt;
  });

  return (
    <div className="space-y-6">
      <AppBar
        title="Approvals"
        description="Review submitted timesheets, remind missing submissions, and handle edit requests."
        secondary={
          <AppBarSecondary
            trailing={<SegmentedControl value={tab} onChange={setTab} options={tabOptions} />}
          />
        }
      />

      <ApprovalsFiltersBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        projectOptions={projectOptions}
        memberOptions={memberOptions}
        loading={filterOptionsLoading}
        showSort={tab === "review"}
        resultCount={
          tab === "review"
            ? pending.length
            : tab === "missing"
              ? missing.length
              : tab === "amendments"
                ? amendments.length
                : tab === "approved"
                  ? approved.length
                  : tab === "rejected"
                    ? rejected.length
                    : undefined
        }
      />

      {tab === "review" ? (
        <LoadingCrossfade loading={loading} loaderLabel="Loading pending timesheets…">
          {pending.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">
                {hasActiveApprovalsFilter(filters)
                  ? "No matching timesheets"
                  : "All timesheets reviewed"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                {hasActiveApprovalsFilter(filters)
                  ? "Try clearing filters or choose a different project, member, or date range."
                  : "You have no pending timesheet approvals left for this workspace."}
              </p>
            </Card>
          ) : (
            <DismissableList
              items={pending}
              className="grid gap-4 md:grid-cols-2"
              renderItem={(t) => {
                const focused = deepLink.periodId === t.id || deepLink.batch === t.id;
                return (
                  <div ref={focused ? focusRef : undefined}>
                    <PendingTimesheetCard
                      item={t}
                      workspaceId={ws}
                      onReview={(action, note) => void handleReview(t.id, action, note)}
                      actioning={actioningId === t.id}
                      highlighted={focused}
                    />
                  </div>
                );
              }}
            />
          )}
        </LoadingCrossfade>
      ) : tab === "missing" ? (
        <LoadingCrossfade loading={missingLoading} loaderLabel="Loading missing submissions…">
          {missing.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">Everyone has submitted for the selected period</p>
            </Card>
          ) : (
            <div className="rounded-lg border border-border/60 overflow-x-auto animate-fade-in">
              <Table className="text-sm">
                <TableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead>Member</DataTableHead>
                    <DataTableHead>Project</DataTableHead>
                    <DataTableHead>Period</DataTableHead>
                    <DataTableHead className="text-right">Hours</DataTableHead>
                    <DataTableHead>Last reminded</DataTableHead>
                    <DataTableHead className="text-right">Actions</DataTableHead>
                  </DataTableHeaderRow>
                </TableHeader>
                <TableBody>
                  {missing.map((row) => {
                    const reminded = remindedToday(row.lastRemindedAt);
                    return (
                      <TableRow key={`${row.userId}:${row.projectId}:${row.periodStart}`}>
                        <DataTableCell>
                          <div className="font-medium">{row.userName}</div>
                          <div className="text-xs text-muted-foreground">{row.userEmail}</div>
                        </DataTableCell>
                        <DataTableCell>{row.projectName}</DataTableCell>
                        <DataTableCell>{row.periodLabel}</DataTableCell>
                        <DataTableCell className="text-right font-mono">
                          {row.totalHours.toFixed(1)}
                        </DataTableCell>
                        <DataTableCell className="text-xs text-muted-foreground">
                          {row.lastRemindedAt
                            ? new Date(row.lastRemindedAt).toLocaleString()
                            : "Never"}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          {reminded ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Reminded today
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setRemindTarget(row)}
                            >
                              Remind
                            </Button>
                          )}
                        </DataTableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </LoadingCrossfade>
      ) : tab === "amendments" ? (
        <LoadingCrossfade loading={amendmentsLoading} loaderLabel="Loading edit requests…">
          {amendments.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">No pending edit requests</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Use Reject on the Pending review tab if you initiated the correction request.
              </p>
            </Card>
          ) : (
            <DismissableList
              items={amendments}
              className="grid gap-4 md:grid-cols-2"
              renderItem={(item) => {
                const focused = deepLink.amendmentId === item.id;
                return (
                  <div ref={focused ? focusRef : undefined}>
                    <AmendmentRequestCard
                      item={item}
                      onReview={(action, note) =>
                        void handleAmendmentReview(item.id, action, note).then(() => fetchPending())
                      }
                      actioning={amendmentActioningId === item.id}
                      highlighted={focused}
                    />
                  </div>
                );
              }}
            />
          )}
        </LoadingCrossfade>
      ) : tab === "approved" ? (
        <LoadingCrossfade loading={approvedLoading} loaderLabel="Loading approved timesheets…">
          {approved.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">
                {hasActiveApprovalsFilter(filters)
                  ? "No matching approved timesheets"
                  : "No approved timesheets yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                {hasActiveApprovalsFilter(filters)
                  ? "Try clearing filters or choose a different project, member, or date range."
                  : "Approved submissions will appear here after you review pending timesheets."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {approved.map((item) => {
                const focused = deepLink.periodId === item.id;
                return (
                  <div key={item.id} ref={focused ? focusRef : undefined}>
                    <ReviewedTimesheetCard item={item} workspaceId={ws} highlighted={focused} />
                  </div>
                );
              })}
            </div>
          )}
        </LoadingCrossfade>
      ) : (
        <LoadingCrossfade loading={rejectedLoading} loaderLabel="Loading rejected timesheets…">
          {rejected.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">
                {hasActiveApprovalsFilter(filters)
                  ? "No matching rejected timesheets"
                  : "No rejected timesheets"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                {hasActiveApprovalsFilter(filters)
                  ? "Try clearing filters or choose a different project, member, or date range."
                  : "Rejected submissions will appear here when you send timesheets back for correction."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rejected.map((item) => {
                const focused = deepLink.periodId === item.id;
                return (
                  <div key={item.id} ref={focused ? focusRef : undefined}>
                    <ReviewedTimesheetCard item={item} workspaceId={ws} highlighted={focused} />
                  </div>
                );
              })}
            </div>
          )}
        </LoadingCrossfade>
      )}

      <RemindMemberDialog
        open={Boolean(remindTarget)}
        onOpenChange={(open) => {
          if (!open) setRemindTarget(null);
        }}
        item={remindTarget}
        submitting={reminding}
        onConfirm={(message) => void sendReminder(message)}
      />
    </div>
  );
}
