"use client";

import { ROUTES } from "@kloqra/contracts";
import type { HourlyRateDto } from "@kloqra/contracts";
import {
  AppBar,
  AppBarListToolbar,
  appBarListFilterTriggerClass,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Input,
  Label,
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
import { usePaginatedList } from "@kloqra/web-shared";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function BillingPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "workspace" | "member" | "project">("ALL");
  const listFilters = useMemo(
    () => (scopeFilter === "ALL" ? undefined : { scope: scopeFilter }),
    [scopeFilter]
  );
  const {
    items: rates,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit,
    loading,
    reload
  } = usePaginatedList<HourlyRateDto>({
    workspaceId: ws,
    basePath: ROUTES.BILLING.RATES,
    filters: listFilters
  });

  const [rate, setRate] = useState("100");
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  async function addRate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(ROUTES.BILLING.RATES, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          rate: parseFloat(rate),
          ...(userId ? { userId } : {})
        })
      });
      setRate("100");
      setUserId("");
      toast.success("Hourly rate saved.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save hourly rate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Billing"
        description="Configure default and per-member hourly rates for workspace billing."
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search rates…"
            searchAriaLabel="Search hourly rates"
            filters={
              <Select
                value={scopeFilter}
                onValueChange={(value) =>
                  setScopeFilter(value as "ALL" | "workspace" | "member" | "project")
                }
              >
                <SelectTrigger
                  className={appBarListFilterTriggerClass}
                  aria-label="Filter by scope"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All scopes</SelectItem>
                  <SelectItem value="workspace">Workspace default</SelectItem>
                  <SelectItem value="member">Per member</SelectItem>
                  <SelectItem value="project">Per project</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        }
      />
      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Add hourly rate</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addRate} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Rate</Label>
              <Input
                id="rate"
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">User ID (optional)</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={saving}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save rate"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <DataTableCard>
        {loading ? (
          <TableLoadingState rows={5} columns={3} />
        ) : rates.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No rates configured.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Rate ($/hr)</DataTableHead>
                  <DataTableHead>User ID</DataTableHead>
                  <DataTableHead>Effective</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id}>
                    <DataTableCell>{r.rate}</DataTableCell>
                    <DataTableCell>{r.userId ?? "Workspace default"}</DataTableCell>
                    <DataTableCell>{new Date(r.effectiveFrom).toLocaleDateString()}</DataTableCell>
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
              disabled={loading}
            />
          </>
        )}
      </DataTableCard>
    </div>
  );
}
