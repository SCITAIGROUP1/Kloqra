/* eslint-disable */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import Link from "next/link";
import { useHelpdeskTickets } from "@/features/helpdesk/use-helpdesk-tickets";
import {
  AppBar,
  Card,
  CardContent,
  Button,
  CenteredLoader,
  DashboardStatCard,
  WidgetShell
} from "@kloqra/ui";
import {
  usePlatformOpsSummary,
  usePlatformSessionStore,
  DASHBOARD_GRID_BREAKPOINTS,
  DASHBOARD_GRID_COLS,
  generateResponsiveLayouts,
  buildWidgetMinSizeMap,
  DashboardArrangeBanner
} from "@kloqra/web-shared";
import { api } from "@/lib/api";
import { ROUTES } from "@kloqra/contracts";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Building2,
  Coins,
  Database,
  Flame,
  LayoutGrid,
  ListTodo,
  Move,
  PieChart as PieIcon,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users,
  Workflow,
  Pause,
  Play,
  RotateCw,
  Trash2,
  Download,
  Key,
  Shield
} from "lucide-react";
import { usePlatformWidgetLayout } from "./use-platform-widget-layout";
import { WidgetControlPanel } from "./widget-control-panel";
import { WIDGET_REGISTRY } from "./widget-registry";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

const ResponsiveGridLayout = WidthProvider(Responsive);

const PLAN_COLORS = ["#6366f1", "#10b981", "#f59e0b"];
const STATUS_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#6366f1"];

export function OpsDashboardPage() {
  const session = usePlatformSessionStore((s) => s.session);
  const platformUserId = session?.user?.id || "default";

  const { summary, loading: summaryLoading, error: summaryError, reload } = usePlatformOpsSummary();
  const {
    tickets: helpdeskTickets,
    total: totalTickets,
    loading: ticketsLoading
  } = useHelpdeskTickets();
  const layoutState = usePlatformWidgetLayout();

  const [isArranging, setIsArranging] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const arrangeSnapshotRef = useRef<any>(null);
  const [gridBreakpoint, setGridBreakpoint] = useState<string>("lg");

  // Ops actions state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Diagnostics states
  const [diagnosticsQueue, setDiagnosticsQueue] = useState<string | null>(null);
  const [failedJobs, setFailedJobs] = useState<any[]>([]);
  const [failedJobsLoading, setFailedJobsLoading] = useState(false);

  const fetchFailedJobs = async (queueName: string) => {
    setFailedJobsLoading(true);
    try {
      const data = await api<any[]>(ROUTES.PLATFORM.QUEUE_FAILED_JOBS(queueName));
      setFailedJobs(data);
    } catch (e) {
      toast.error("Failed to load queue diagnostics");
    } finally {
      setFailedJobsLoading(false);
    }
  };

  useEffect(() => {
    if (diagnosticsQueue) {
      void fetchFailedJobs(diagnosticsQueue);
    } else {
      setFailedJobs([]);
    }
  }, [diagnosticsQueue]);

  const handleRetrySpecificJob = async (queueName: string, jobId: string) => {
    setActionLoading(`retry-job-${jobId}`);
    try {
      await api(ROUTES.PLATFORM.QUEUE_RETRY_JOB(queueName, jobId), { method: "POST" });
      toast.success(`Job ${jobId} successfully retried`);
      void fetchFailedJobs(queueName);
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to retry job");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (platformUserId) {
      void layoutState.initialize(platformUserId);
    }
  }, [platformUserId]);

  const activeLayout = layoutState.layoutsByWorkspace[platformUserId] || [];
  const visibleItems = activeLayout.filter((item) => item.visible);
  const widgetMinSizes = useMemo(() => buildWidgetMinSizeMap(WIDGET_REGISTRY), []);

  const responsiveLayouts = useMemo(
    () => generateResponsiveLayouts(visibleItems, DASHBOARD_GRID_COLS, widgetMinSizes),
    [visibleItems, widgetMinSizes]
  );

  const handleResetLayout = () => {
    void layoutState
      .resetLayout(platformUserId)
      .then(() => toast.success("Dashboard layout reset to default"))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not reset layout"));
  };

  const handleCancelArranging = () => {
    if (arrangeSnapshotRef.current) {
      layoutState.restoreLayout(platformUserId, arrangeSnapshotRef.current);
    }
    setIsArranging(false);
  };

  const handleDoneArranging = async () => {
    try {
      await layoutState.persistLayout(platformUserId);
      arrangeSnapshotRef.current = null;
      setIsArranging(false);
      toast.success("Dashboard layout saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save layout");
    }
  };

  const handleDoneAndSaveAsDefault = async () => {
    try {
      await layoutState.persistLayout(platformUserId);
      await layoutState.saveLayoutAsDefault(platformUserId);
      arrangeSnapshotRef.current = null;
      setIsArranging(false);
      toast.success("Dashboard layout saved as default");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save default layout");
    }
  };

  // Queue actions
  const handleQueueAction = async (
    queueName: string,
    action: "pause" | "resume" | "retry-failed"
  ) => {
    setActionLoading(`${queueName}-${action}`);
    try {
      let route = "";
      if (action === "pause") route = ROUTES.PLATFORM.QUEUE_PAUSE(queueName);
      else if (action === "resume") route = ROUTES.PLATFORM.QUEUE_RESUME(queueName);
      else route = ROUTES.PLATFORM.QUEUE_RETRY_FAILED(queueName);

      await api(route, { method: "POST" });
      toast.success(`Successfully executed ${action} on ${queueName}`);
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to execute ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  // GDPR export
  const handleGdprExport = async (tenantId: string) => {
    setActionLoading(`gdpr-export-${tenantId}`);
    try {
      const data = await api<Record<string, any>>(ROUTES.PLATFORM.TENANT_GDPR_EXPORT(tenantId), {
        method: "POST"
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gdpr-export-tenant-${tenantId}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("GDPR export package generated and downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to run GDPR export");
    } finally {
      setActionLoading(null);
    }
  };

  // GDPR delete
  const handleGdprDelete = async (tenantId: string) => {
    if (
      !confirm(
        "CRITICAL WARNING: This will permanently cascade-delete all spaces, members, logs, and billing details for this organization from the database. Are you absolutely sure?"
      )
    ) {
      return;
    }
    setActionLoading(`gdpr-delete-${tenantId}`);
    try {
      await api(ROUTES.PLATFORM.TENANT_GDPR_DELETE(tenantId), { method: "DELETE" });
      toast.success("Tenant and all associated data permanently deleted");
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to execute hard delete");
    } finally {
      setActionLoading(null);
    }
  };

  // Security locks
  const handleSecurityAction = async (tenantId: string, action: "revoke" | "mfa-reset") => {
    setActionLoading(`sec-${action}-${tenantId}`);
    try {
      const route =
        action === "revoke"
          ? ROUTES.PLATFORM.TENANT_REVOKE_SESSIONS(tenantId)
          : ROUTES.PLATFORM.TENANT_RESET_MFA(tenantId);
      await api(route, { method: "POST" });
      toast.success(
        action === "revoke"
          ? "All active tenant user tokens revoked"
          : "MFA configuration reset successfully"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to run security action");
    } finally {
      setActionLoading(null);
    }
  };

  // Billing override
  const handleBillingOverride = async (
    tenantId: string,
    maxWorkspaces: number,
    maxSeats: number
  ) => {
    setActionLoading(`billing-${tenantId}`);
    try {
      await api(ROUTES.PLATFORM.TENANT_LIMITS_OVERRIDE(tenantId), {
        method: "POST",
        body: JSON.stringify({ maxWorkspaces, maxSeats })
      });
      toast.success("Subscription limits overrides applied");
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply overrides");
    } finally {
      setActionLoading(null);
    }
  };

  // Render widget content helper
  function renderWidgetContent(id: string) {
    if (!summary) return null;

    switch (id) {
      case "stat_fleet_active_tenants":
        return (
          <DashboardStatCard
            label="Active Tenants"
            value={String(summary.tenants.active)}
            hint={`${summary.tenants.pendingSetup} pending setup`}
            icon={Building2}
            tone="primary"
          />
        );
      case "stat_platform_mrr":
        const mrrAmount = summary.mrr ? summary.mrr.amountCents / 100 : 0;
        return (
          <DashboardStatCard
            label="Platform MRR"
            value={new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0
            }).format(mrrAmount)}
            hint="Active + trialing"
            icon={Coins}
            tone="success"
          />
        );
      case "stat_fleet_seats":
        return (
          <DashboardStatCard
            label="Active Seats"
            value={String(summary.usage.totalSeats)}
            hint={`${summary.usage.totalWorkspaces} workspaces`}
            icon={Users}
            tone="warning"
          />
        );
      case "stat_pending_tickets":
        return (
          <DashboardStatCard
            label="Open Tickets"
            value={ticketsLoading ? "..." : String(totalTickets)}
            hint="Urgent support requests"
            icon={ListTodo}
            tone="warning"
          />
        );

      case "donut_plan_distribution":
        const planData = [
          { name: "Pro Plan", value: summary.subscriptions.active },
          { name: "Trial Plan", value: summary.subscriptions.trial },
          { name: "Past Due", value: summary.subscriptions.pastDue }
        ];
        return (
          <div className="h-full w-full flex flex-col items-center justify-center p-2 min-h-0">
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} orgs`, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 shrink-0 border-t border-border/20 pt-2 w-full">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" /> Pro (
                {summary.subscriptions.active})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Trial (
                {summary.subscriptions.trial})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Past Due (
                {summary.subscriptions.pastDue})
              </div>
            </div>
          </div>
        );

      case "donut_tenant_statuses":
        const statusData = [
          { name: "Active", value: summary.tenants.active },
          { name: "Suspended", value: summary.tenants.suspended },
          { name: "Pending", value: summary.tenants.pendingSetup }
        ];
        return (
          <div className="h-full w-full flex flex-col items-center justify-center p-2 min-h-0">
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} tenants`, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 shrink-0 border-t border-border/20 pt-2 w-full">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Active (
                {summary.tenants.active})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Suspended (
                {summary.tenants.suspended})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Pending (
                {summary.tenants.pendingSetup})
              </div>
            </div>
          </div>
        );

      case "trend_tenant_signups":
        const signupTrend = [
          { month: "Jan", Free: 12, Pro: 5, Enterprise: 1 },
          { month: "Feb", Free: 18, Pro: 9, Enterprise: 2 },
          { month: "Mar", Free: 15, Pro: 11, Enterprise: 1 },
          { month: "Apr", Free: 22, Pro: 14, Enterprise: 3 },
          { month: "May", Free: 29, Pro: 19, Enterprise: 4 },
          {
            month: "Jun",
            Free: summary.tenants.active,
            Pro: summary.subscriptions.active,
            Enterprise: 2
          }
        ];
        return (
          <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="Free" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pro" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Enterprise" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case "trend_mrr_growth":
        const mrrTrend = [
          { month: "Jan", MRR: 8500 },
          { month: "Feb", MRR: 11200 },
          { month: "Mar", MRR: 14000 },
          { month: "Apr", MRR: 18900 },
          { month: "May", MRR: 24500 },
          { month: "Jun", MRR: summary.mrr ? summary.mrr.amountCents / 100 : 29500 }
        ];
        return (
          <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mrrTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="MRR"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case "trend_load_heatmap":
        return (
          <div className="grid grid-cols-12 gap-1 h-full w-full p-2 select-none">
            {Array.from({ length: 24 }).map((_, hour) => (
              <div
                key={hour}
                className="flex flex-col gap-1 items-center justify-center rounded bg-primary/5 hover:bg-primary/20 transition-all border border-primary/5 cursor-pointer"
              >
                <span className="text-[9px] font-mono text-muted-foreground">{hour}h</span>
                <span className="text-[10px] font-semibold text-primary">
                  {10 + (hour % 6) * 15}%
                </span>
              </div>
            ))}
          </div>
        );

      case "trend_error_volume":
        const errorTrend = [
          { day: "Mon", Errors: 4 },
          { day: "Tue", Errors: 12 },
          { day: "Wed", Errors: 2 },
          { day: "Thu", Errors: 8 },
          { day: "Fri", Errors: 15 },
          { day: "Sat", Errors: 1 },
          { day: "Sun", Errors: 0 }
        ];
        return (
          <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errorTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="day"
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Errors"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case "ops_queue_depth":
        return (
          <div className="divide-y divide-border/40 text-xs w-full h-full overflow-y-auto px-1">
            {Object.entries(summary.queues).map(([name, counts]) => (
              <div key={name} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Workflow className="size-3 text-muted-foreground" />
                    <span>{name}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 space-x-2">
                    <span>wait: {counts.waiting}</span>
                    <span>active: {counts.active}</span>
                    <span className={counts.failed > 0 ? "text-destructive font-semibold" : ""}>
                      failed: {counts.failed}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    title="Pause workers"
                    disabled={actionLoading !== null}
                    onClick={() => handleQueueAction(name, "pause")}
                  >
                    <Pause className="size-3 text-muted-foreground" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    title="Resume workers"
                    disabled={actionLoading !== null}
                    onClick={() => handleQueueAction(name, "resume")}
                  >
                    <Play className="size-3 text-muted-foreground" />
                  </Button>
                  {counts.failed > 0 && (
                    <div
                      className="flex items-center gap-1 select-none widget-no-drag"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px] gap-1 hover:bg-destructive/10 hover:text-destructive border-destructive/20 text-destructive font-semibold"
                        disabled={actionLoading !== null}
                        onClick={() => setDiagnosticsQueue(name)}
                      >
                        <AlertTriangle className="size-3" />
                        <span>Diagnose</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary border-primary/20"
                        disabled={actionLoading !== null}
                        onClick={() => handleQueueAction(name, "retry-failed")}
                      >
                        <RotateCw className="size-3" />
                        <span>Retry All</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case "ops_mrr_drift":
        return (
          <div className="flex flex-col items-center justify-center text-center p-4 h-full w-full">
            <RefreshCw
              className={`size-8 ${summary.reconcile.driftCount > 0 ? "text-destructive animate-spin" : "text-muted-foreground"}`}
            />
            <span className="font-bold text-base mt-2">
              {summary.reconcile.driftCount} Discrepancies
            </span>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
              Active subscriptions with discrepancy between Database and Stripe.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 text-[10px] h-8 border-primary/20 hover:bg-primary/5"
            >
              Reconcile Subscriptions
            </Button>
          </div>
        );

      case "ops_db_pool_status":
        return (
          <div className="text-xs p-3 space-y-3 h-full w-full overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Active Pool Connections</span>
              <span className="font-semibold font-mono text-success">5 / 20</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average Query Latency</span>
              <span className="font-semibold font-mono text-foreground">4.2 ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Wait Queue depth</span>
              <span className="font-semibold font-mono text-muted-foreground">0</span>
            </div>
            <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full w-[25%]" />
            </div>
          </div>
        );

      case "wf_pending_tickets":
        return (
          <div className="divide-y divide-border/40 text-xs w-full h-full overflow-y-auto px-1">
            {ticketsLoading && <CenteredLoader label="Loading tickets…" />}
            {!ticketsLoading && (!helpdeskTickets || helpdeskTickets.length === 0) && (
              <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <p className="text-[10px] text-muted-foreground/60">No pending support tickets.</p>
              </div>
            )}
            {!ticketsLoading &&
              helpdeskTickets &&
              helpdeskTickets.slice(0, 5).map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                      <ListTodo className="size-3 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        #{t.ticketNumber} - {t.subject}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{t.requesterName}</span>
                      {t.tenant?.name && <span>· {t.tenant.name}</span>}
                    </div>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      t.priority === "HIGH" || t.priority === "URGENT" || t.priority === "CRITICAL"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
          </div>
        );

      case "wf_gdpr_requests":
        // GDPR exports controls
        const gdprTenants = [{ id: "acme-tenant-uuid", name: "Acme Corp", status: "Active" }];
        return (
          <div className="divide-y divide-border/40 text-xs w-full h-full overflow-y-auto px-1">
            {gdprTenants.map((t) => (
              <div key={t.id} className="py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldAlert className="size-3.5 text-warning" />
                    <span>{t.name}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {t.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex gap-2 w-full mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-7 gap-1 border-primary/20 flex-1 hover:bg-primary/5"
                    disabled={actionLoading !== null}
                    onClick={() => handleGdprExport(t.id)}
                  >
                    <Download className="size-3" />
                    <span>Export</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-7 gap-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 flex-1"
                    disabled={actionLoading !== null}
                    onClick={() => handleGdprDelete(t.id)}
                  >
                    <Trash2 className="size-3" />
                    <span>Hard Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-semibold text-muted-foreground">Ops Widget</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[185px]">
              This widget is not registered.
            </p>
          </div>
        );
    }
  }

  // Quick Action controls in WidgetHeader
  function renderWidgetHeaderControls(id: string) {
    if (!summary) return null;

    if (id === "wf_pending_tickets") {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[9px] px-2 py-0 border-primary/20 bg-background/50 hover:bg-background"
          asChild
        >
          <Link href="/helpdesk">Manage Tickets</Link>
        </Button>
      );
    }

    // Security triggers inside widgets
    if (id === "donut_tenant_statuses") {
      const activeTenantId = "acme-tenant-uuid"; // Seeded support instance target
      return (
        <div className="flex gap-1 select-none widget-no-drag" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[9px] px-2 py-0 gap-1 border-primary/10 hover:border-primary/20"
            title="Lockout all sessions for support target"
            disabled={actionLoading !== null}
            onClick={() => handleSecurityAction(activeTenantId, "revoke")}
          >
            <Shield className="size-2.5" />
            <span>Lock</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[9px] px-2 py-0 gap-1 border-primary/10 hover:border-primary/20"
            title="Reset active user MFA configuration"
            disabled={actionLoading !== null}
            onClick={() => handleSecurityAction(activeTenantId, "mfa-reset")}
          >
            <Key className="size-2.5" />
            <span>2FA</span>
          </Button>
        </div>
      );
    }

    if (id === "stat_fleet_seats") {
      const activeTenantId = "acme-tenant-uuid";
      return (
        <div className="flex gap-1 select-none widget-no-drag" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[9px] px-2 py-0 gap-1 border-primary/20 hover:bg-primary/5"
            title="Override max spaces & seat limits for Acme Corp"
            disabled={actionLoading !== null}
            onClick={() => handleBillingOverride(activeTenantId, 25, 60)}
          >
            <span>Override</span>
          </Button>
        </div>
      );
    }

    return null;
  }

  if (summaryLoading) {
    return <CenteredLoader label="Loading ops dashboard..." />;
  }

  if (summaryError) {
    return <div className="text-sm text-destructive p-4">{summaryError}</div>;
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Ops Dashboard"
        description="Fleet health — customizable grid widget view."
        actions={
          <>
            <AppBarActionButton
              active={isCatalogOpen}
              aria-label={isCatalogOpen ? "Closing catalog" : "Add widgets"}
              onClick={() => {
                setIsCatalogOpen(!isCatalogOpen);
                if (isArranging) {
                  handleCancelArranging();
                }
              }}
            >
              <LayoutGrid className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">
                {isCatalogOpen ? "Closing Catalog" : "Add Widgets"}
              </span>
            </AppBarActionButton>
            <AppBarActionButton
              active={isArranging}
              aria-label={isArranging ? "Done arranging" : "Arrange grid"}
              onClick={async () => {
                if (isArranging) {
                  try {
                    await layoutState.persistLayout(platformUserId);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not save dashboard layout");
                    return;
                  }
                  arrangeSnapshotRef.current = null;
                } else {
                  const current = layoutState.layoutsByWorkspace[platformUserId];
                  if (current) {
                    arrangeSnapshotRef.current = current.map((item) => ({ ...item }));
                  }
                }
                setIsArranging(!isArranging);
                setIsCatalogOpen(false);
              }}
            >
              <Move className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">
                {isArranging ? "Done Arranging" : "Arrange Grid"}
              </span>
            </AppBarActionButton>
          </>
        }
      />

      {/* Slide-out Customize catalogue drawer */}
      {isCatalogOpen && (
        <WidgetControlPanel
          layoutItems={activeLayout}
          onToggleWidget={(id) => layoutState.toggleWidget(platformUserId, id)}
          onResetLayout={handleResetLayout}
          onClose={() => setIsCatalogOpen(false)}
        />
      )}

      {/* Drag & Arrange Banner indicator */}
      {isArranging && (
        <DashboardArrangeBanner
          editModeLabel="Superadmin Grid Edit Mode"
          onCancel={handleCancelArranging}
          onResetLayout={handleResetLayout}
          onDone={handleDoneArranging}
          onSaveAsDefault={handleDoneAndSaveAsDefault}
        />
      )}

      <div className="relative">
        {!layoutState.initialized ? (
          <CenteredLoader label="Loading widget layouts..." />
        ) : (
          <ResponsiveGridLayout
            className={`layout ${isArranging ? "layout-customizing" : ""}`}
            layouts={responsiveLayouts}
            breakpoints={DASHBOARD_GRID_BREAKPOINTS}
            cols={DASHBOARD_GRID_COLS}
            rowHeight={80}
            compactType="vertical"
            isDraggable={isArranging}
            isResizable={isArranging}
            draggableCancel="button, a, input, select, textarea, [role='menu'], [role='menuitem'], .widget-no-drag"
            resizeHandles={["s", "e", "se"]}
            onBreakpointChange={(breakpoint) => setGridBreakpoint(breakpoint)}
            onLayoutChange={(currentLayout) => {
              if (isArranging) {
                layoutState.updateLayout(platformUserId, currentLayout, { persist: false });
              }
            }}
            margin={[16, 16]}
            containerPadding={[0, 0]}
          >
            {visibleItems.map((item) => {
              const widgetDef = WIDGET_REGISTRY.find((w) => w.id === item.i);
              const label = widgetDef?.label ?? "Widget";
              return (
                <div key={item.i} className="min-w-0 h-full w-full">
                  <WidgetShell
                    id={item.i}
                    label={label}
                    isEditing={isArranging}
                    className="h-full [&>div]:flex [&>div]:flex-col [&>div>div:last-child]:flex-1 [&>div>div:last-child]:min-h-0"
                    showTitleInView={widgetDef?.group !== "kpi"}
                    headerActions={renderWidgetHeaderControls(item.i)}
                  >
                    {renderWidgetContent(item.i)}
                  </WidgetShell>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Diagnostics Modal */}
      {diagnosticsQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-destructive animate-pulse" />
                <h3 className="font-bold text-foreground text-sm">
                  Failed Job Diagnostics: {diagnosticsQueue}
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setDiagnosticsQueue(null)}
              >
                Close
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto min-h-0 space-y-4">
              {failedJobsLoading && <CenteredLoader label="Analyzing failed queue jobs..." />}

              {!failedJobsLoading && failedJobs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No failed jobs found. They may have already been resolved or cleared.
                </div>
              )}

              {!failedJobsLoading &&
                failedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="border border-border/60 bg-muted/10 rounded-lg p-3.5 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground block truncate">
                          Job: {job.name || "Unnamed"}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block font-mono">
                          ID: {job.id} · Failed: {new Date(job.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary border-primary/20 shrink-0"
                        disabled={actionLoading !== null}
                        onClick={() => handleRetrySpecificJob(diagnosticsQueue, job.id)}
                      >
                        <RotateCw className="size-3" />
                        <span>Retry Job</span>
                      </Button>
                    </div>

                    <div className="bg-destructive/10 border border-destructive/20 rounded p-2.5">
                      <span className="font-semibold text-[10px] text-destructive block">
                        Failure Reason:
                      </span>
                      <p className="text-[10px] font-mono text-destructive mt-1 break-words leading-relaxed">
                        {job.failedReason || "Unknown failure reason"}
                      </p>
                    </div>

                    {job.stacktrace && job.stacktrace.length > 0 && (
                      <div className="bg-muted border border-border/80 rounded p-2.5">
                        <span className="font-semibold text-[10px] text-muted-foreground block">
                          Stack Trace Snippet:
                        </span>
                        <pre className="text-[9px] font-mono text-muted-foreground mt-1 overflow-x-auto whitespace-pre leading-normal">
                          {job.stacktrace.join("\n")}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component wrapper for actions button layout
function AppBarActionButton({
  active,
  children,
  onClick,
  ...props
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  [key: string]: any;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className={`h-8 gap-1.5 text-xs font-semibold px-3 ${active ? "bg-primary text-primary-foreground border-primary" : "border-border/60"}`}
      {...props}
    >
      {children}
    </Button>
  );
}
