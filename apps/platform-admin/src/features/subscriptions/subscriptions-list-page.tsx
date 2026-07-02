"use client";

import {
  ROUTES,
  type SubscriptionStatus,
  type PlatformSubscriptionListItemDto
} from "@kloqra/contracts";
import {
  AppBar,
  AppBarListToolbar,
  appBarListFilterTriggerClass,
  Button,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableLoadingState,
  AppModal,
  Label,
  SearchableSelect
} from "@kloqra/ui";
import {
  usePlatformSubscriptions,
  usePlatformSubscriptionWorkQueue,
  usePlatformPlans,
  api
} from "@kloqra/web-shared";
import { Send, Settings } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const ALL = "__all__";

const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: ALL, label: "All statuses" },
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "suspended", label: "Suspended" },
  { value: "canceled", label: "Canceled" }
];

const SOURCE_OPTIONS = [
  { value: ALL, label: "All sources" },
  { value: "stripe", label: "Stripe" },
  { value: "simulated", label: "Simulated" },
  { value: "manual", label: "Manual" }
];

export function SubscriptionsListPage() {
  const { plans, loading: plansLoading } = usePlatformPlans();
  const workQueue = usePlatformSubscriptionWorkQueue();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [planFilter, setPlanFilter] = useState<string>(ALL);
  const [sourceFilter, setSourceFilter] = useState<string>(ALL);

  // Modal states for manual plan assignment
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  const listFilters = useMemo(
    () => ({
      ...(statusFilter !== ALL ? { status: statusFilter as SubscriptionStatus } : {}),
      ...(planFilter !== ALL ? { planSlug: planFilter } : {}),
      ...(sourceFilter !== ALL ? { billingSource: sourceFilter } : {})
    }),
    [planFilter, statusFilter, sourceFilter]
  );

  const {
    items: allSubscriptions,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit,
    loading: allLoading,
    error: allError,
    reload: reloadAll
  } = usePlatformSubscriptions(listFilters);

  // Tabs structure
  const tabs = [
    { id: "all", label: "All" },
    { id: "needs_action", label: "Needs action", count: workQueue.items.length },
    { id: "past_due", label: "Past due", count: workQueue.counts.pastDue },
    { id: "trial_ending", label: "Trials ending", count: workQueue.counts.trialEnding },
    {
      id: "sales_pending",
      label: "Sales pending",
      count: workQueue.counts.salesPending + workQueue.counts.receiptReview
    },
    { id: "drift", label: "Drift", count: workQueue.counts.drift }
  ];

  // Client-side filtering for work-queue items
  const displayedWorkQueueItems = useMemo(() => {
    if (activeTab === "all") return [];
    let items = [...workQueue.items];

    // Apply client-side search to work queue
    if (search.trim()) {
      const s = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.tenantName.toLowerCase().includes(s) || item.tenantSlug.toLowerCase().includes(s)
      );
    }

    if (activeTab === "needs_action") {
      return items;
    }
    if (activeTab === "past_due") {
      return items.filter((item) => item.status === "past_due");
    }
    if (activeTab === "trial_ending") {
      return items.filter((item) => item.workItem === "trial_ending");
    }
    if (activeTab === "sales_pending") {
      return items.filter(
        (item) => item.workItem === "sales_open" || item.workItem === "sales_receipt_submitted"
      );
    }
    if (activeTab === "drift") {
      return items.filter((item) => item.workItem === "drift");
    }

    return items;
  }, [activeTab, workQueue.items, search]);

  const isLoading = activeTab === "all" ? allLoading : workQueue.loading;
  const error = activeTab === "all" ? allError : workQueue.error;

  const handleReload = () => {
    void reloadAll();
    void workQueue.reload();
  };

  // Inline action: Send billing instructions for open inquiries
  const handleSendInstructions = async (tenantId: string, inquiryId: string) => {
    try {
      await api(ROUTES.PLATFORM.TENANT_SALES_INQUIRY_SEND_INSTRUCTIONS(tenantId, inquiryId), {
        method: "POST"
      });
      handleReload();
    } catch {
      alert("Failed to send billing instructions.");
    }
  };

  // Open plan assignment modal
  const openAssignPlanModal = (tenantId: string, tenantName: string, currentPlanId: string) => {
    setSelectedTenantId(tenantId);
    setSelectedTenantName(tenantName);
    setSelectedPlanId(currentPlanId);
    setAssignError("");
    setAssignModalOpen(true);
  };

  const handleAssignPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !selectedPlanId) return;
    setAssignError("");
    setAssigning(true);
    try {
      await api(ROUTES.PLATFORM.TENANT(selectedTenantId), {
        method: "PATCH",
        body: JSON.stringify({ planId: selectedPlanId })
      });
      setAssignModalOpen(false);
      handleReload();
    } catch (e: any) {
      setAssignError(e instanceof Error ? e.message : "Failed to assign plan.");
    } finally {
      setAssigning(false);
    }
  };

  // Plan options for the dropdown
  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        value: plan.id,
        label: `${plan.name} (${plan.slug})`,
        keywords: `${plan.name} ${plan.slug}`
      })),
    [plans]
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "trial":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      case "past_due":
        return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
      case "suspended":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "canceled":
        return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const getSourceStyle = (source: string) => {
    switch (source) {
      case "stripe":
        return "text-indigo-500 font-medium";
      case "simulated":
        return "text-amber-500 font-medium";
      default:
        return "text-muted-foreground font-medium";
    }
  };

  const formatCycleEnds = (item: PlatformSubscriptionListItemDto) => {
    if (item.status === "trial" && item.trialEndsAt) {
      return (
        <span className="flex flex-col">
          <span className="font-medium text-blue-500">Trial ends</span>
          <span className="text-xs text-muted-foreground">
            {new Date(item.trialEndsAt).toLocaleDateString()}
          </span>
        </span>
      );
    }
    if ((item.status === "active" || item.status === "past_due") && item.currentPeriodEnd) {
      return (
        <span className="flex flex-col">
          <span className="font-medium">Renews</span>
          <span className="text-xs text-muted-foreground">
            {new Date(item.currentPeriodEnd).toLocaleDateString()}
          </span>
        </span>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  };

  return (
    <div className="space-y-6">
      <AppBar
        title="Subscriptions"
        description="Fleet-wide billing cycles, enterprise pipeline, and Stripe drift management."
      />

      {/* Tabs navigation */}
      <div className="border-b border-border flex flex-wrap gap-2" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-[2px] ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-bold">
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Toolbar - search and filters (only visible for All tab or search) */}
      <AppBarListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by organization name or slug…"
        searchAriaLabel="Search subscriptions"
        filters={
          activeTab === "all" ? (
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  className={appBarListFilterTriggerClass}
                  aria-label="Filter by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className={appBarListFilterTriggerClass} aria-label="Filter by plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All plans</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.slug}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger
                  className={appBarListFilterTriggerClass}
                  aria-label="Filter by source"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : null
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DataTableCard>
        {isLoading ? (
          <TableLoadingState rows={5} columns={7} />
        ) : (activeTab === "all" ? allSubscriptions.length : displayedWorkQueueItems.length) ===
          0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            {search || statusFilter !== ALL || planFilter !== ALL || sourceFilter !== ALL
              ? "No subscriptions match your filters."
              : "No subscriptions in this queue."}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Organization</DataTableHead>
                  <DataTableHead>Plan</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Billing Interval</DataTableHead>
                  <DataTableHead>Cycle Ends</DataTableHead>
                  <DataTableHead>On Plan Since</DataTableHead>
                  <DataTableHead>Source</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "all" ? allSubscriptions : displayedWorkQueueItems).map((item) => (
                  <TableRow key={item.tenantId}>
                    <DataTableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/subscriptions/${item.tenantId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.tenantName}
                        </Link>
                        <span className="text-xs text-muted-foreground font-mono">
                          {item.tenantSlug}
                        </span>
                      </div>
                    </DataTableCell>
                    <DataTableCell>{item.planName}</DataTableCell>
                    <DataTableCell>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusStyle(item.status)}`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="capitalize">
                      {item.billingInterval ?? "—"}
                    </DataTableCell>
                    <DataTableCell>{formatCycleEnds(item)}</DataTableCell>
                    <DataTableCell>
                      <div className="flex flex-col">
                        <span>{new Date(item.planAssignedAt).toLocaleDateString()}</span>
                        <span className="text-xs text-muted-foreground">
                          ({item.daysOnPlan} days)
                        </span>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="capitalize">
                      <span className={getSourceStyle(item.billingSource)}>
                        {item.billingSource}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {/* Action: Fulfill / Assign Plan if receipt is submitted */}
                        {item.workItem === "sales_receipt_submitted" ? (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              openAssignPlanModal(item.tenantId, item.tenantName, item.planId)
                            }
                          >
                            Assign Plan
                          </Button>
                        ) : null}

                        {/* Action: Send billing instructions */}
                        {item.workItem === "sales_open" && item.salesInquiryId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleSendInstructions(item.tenantId, item.salesInquiryId!)
                            }
                            className="flex items-center gap-1"
                          >
                            <Send className="h-3 w-3" /> Send Instructions
                          </Button>
                        ) : null}

                        {/* Action: Link to Detail */}
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/subscriptions/${item.tenantId}`}>View Details</Link>
                        </Button>
                      </div>
                    </DataTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination is only rendered/needed for the full 'All' tab */}
            {activeTab === "all" ? (
              <TablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
                pageUnit="subscriptions"
                disabled={isLoading}
              />
            ) : null}
          </>
        )}
      </DataTableCard>

      {/* Manual plan assignment Modal */}
      <AppModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        title="Assign Enterprise Plan"
        description={`Manually assign a subscription plan to ${selectedTenantName}. This overrides Stripe and initiates a manual billing tenure.`}
        icon={<Settings className="h-5 w-5 text-primary" />}
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignModalOpen(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button type="submit" form="assign-plan-form" disabled={assigning || !selectedPlanId}>
              {assigning ? "Assigning..." : "Assign Plan"}
            </Button>
          </div>
        }
      >
        <form id="assign-plan-form" onSubmit={handleAssignPlanSubmit} className="space-y-4">
          {assignError ? <p className="text-sm text-destructive">{assignError}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="assign-plan-select">Choose Plan</Label>
            <SearchableSelect
              id="assign-plan-select"
              options={planOptions}
              value={selectedPlanId}
              onValueChange={setSelectedPlanId}
              placeholder={plansLoading ? "Loading plans…" : "Select plan..."}
              disabled={plansLoading || planOptions.length === 0}
            />
          </div>
        </form>
      </AppModal>
    </div>
  );
}
