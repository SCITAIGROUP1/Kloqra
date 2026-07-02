"use client";

import type { SubscriptionStatus, TenantStatus } from "@kloqra/contracts";
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
  TableLoadingState
} from "@kloqra/ui";
import { usePlatformPlans, usePlatformTenants } from "@kloqra/web-shared";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TenantCreateModal } from "./tenant-create-modal";
import { formatTenantStatusLabel } from "./tenant-labels";

const ALL = "__all__";

const STATUS_OPTIONS: Array<{ value: TenantStatus | typeof ALL; label: string }> = [
  { value: ALL, label: "All statuses" },
  { value: "pending_setup", label: "Pending setup" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "churned", label: "Churned" }
];

const SUBSCRIPTION_STATUS_OPTIONS: Array<{
  value: SubscriptionStatus | typeof ALL;
  label: string;
}> = [
  { value: ALL, label: "All subscriptions" },
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "suspended", label: "Suspended" },
  { value: "canceled", label: "Canceled" }
];

export function TenantListPage() {
  const { plans } = usePlatformPlans();
  const [statusFilter, setStatusFilter] = useState<TenantStatus | typeof ALL>(ALL);
  const [planFilter, setPlanFilter] = useState<string>(ALL);
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionStatus | typeof ALL>(
    ALL
  );
  const [createOpen, setCreateOpen] = useState(false);

  const listFilters = useMemo(
    () => ({
      ...(statusFilter !== ALL ? { status: statusFilter } : {}),
      ...(planFilter !== ALL ? { planSlug: planFilter } : {}),
      ...(subscriptionFilter !== ALL ? { subscriptionStatus: subscriptionFilter } : {})
    }),
    [planFilter, statusFilter, subscriptionFilter]
  );

  const {
    items: tenants,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit,
    loading,
    error,
    reload
  } = usePlatformTenants(listFilters);

  return (
    <div className="space-y-6">
      <AppBar
        title="Tenants"
        description="Organization accounts provisioned on Kloqra."
        actions={<Button onClick={() => setCreateOpen(true)}>Create tenant</Button>}
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name or slug…"
            searchAriaLabel="Search tenants"
            filters={
              <>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as TenantStatus | typeof ALL)}
                >
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by plan"
                  >
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
                <Select
                  value={subscriptionFilter}
                  onValueChange={(value) =>
                    setSubscriptionFilter(value as SubscriptionStatus | typeof ALL)
                  }
                >
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by subscription status"
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
              </>
            }
          />
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DataTableCard>
        {loading ? (
          <TableLoadingState rows={5} columns={6} />
        ) : tenants.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {search || statusFilter !== ALL || planFilter !== ALL || subscriptionFilter !== ALL
              ? "No tenants match your filters."
              : "No tenants yet."}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Name</DataTableHead>
                  <DataTableHead>Slug</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Plan</DataTableHead>
                  <DataTableHead>Workspaces</DataTableHead>
                  <DataTableHead>Members</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <DataTableCell>
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {tenant.name}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>{tenant.slug}</DataTableCell>
                    <DataTableCell>{formatTenantStatusLabel(tenant.status)}</DataTableCell>
                    <DataTableCell>{tenant.planSlug ?? "—"}</DataTableCell>
                    <DataTableCell>{tenant.workspaceCount}</DataTableCell>
                    <DataTableCell>{tenant.memberCount}</DataTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              pageUnit="tenants"
              disabled={loading}
            />
          </>
        )}
      </DataTableCard>

      <TenantCreateModal open={createOpen} onOpenChange={setCreateOpen} onCreated={reload} />
    </div>
  );
}
