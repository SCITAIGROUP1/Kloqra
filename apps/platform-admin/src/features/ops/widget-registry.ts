import {
  Activity,
  AlertTriangle,
  Building2,
  Coins,
  Database,
  Flame,
  ListTodo,
  PieChart,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users,
  Workflow
} from "lucide-react";

export type WidgetGroup = "kpi" | "trends" | "composition" | "ops" | "workflow";

export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  group: WidgetGroup;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
  defaultVisible: boolean;
  iconName: string;
}

export interface WidgetLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

export const WIDGET_GROUPS: { value: WidgetGroup; label: string }[] = [
  { value: "kpi", label: "KPI Stat Cards" },
  { value: "trends", label: "Growth & Load Trends" },
  { value: "composition", label: "SaaS Composition" },
  { value: "ops", label: "Operational Telemetry" },
  { value: "workflow", label: "Actionable Workflows" }
];

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // Group A - KPI Stat Cards
  {
    id: "stat_fleet_active_tenants",
    label: "Active Tenants",
    description: "Number of active customer tenants on the platform",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    defaultVisible: true,
    iconName: "Building2"
  },
  {
    id: "stat_platform_mrr",
    label: "Platform MRR",
    description: "Total aggregated monthly recurring revenue from Stripe",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    defaultVisible: true,
    iconName: "Coins"
  },
  {
    id: "stat_fleet_seats",
    label: "Active Seats",
    description: "Total active users logged in across all organizations",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    defaultVisible: true,
    iconName: "Users"
  },
  {
    id: "stat_pending_tickets",
    label: "Open Tickets",
    description: "Total unresolved customer helpdesk support tickets",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    defaultVisible: true,
    iconName: "ListTodo"
  },

  // Group B - Growth & Load Trends
  {
    id: "trend_tenant_signups",
    label: "Tenant Sign-up Trend",
    description: "Monthly signups grouped by subscription tier",
    group: "trends",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    defaultVisible: true,
    iconName: "TrendingUp"
  },
  {
    id: "trend_mrr_growth",
    label: "MRR Growth Curve",
    description: "Cumulative monthly MRR revenue growth curve",
    group: "trends",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    defaultVisible: true,
    iconName: "TrendingUp"
  },
  {
    id: "trend_load_heatmap",
    label: "API Load Heatmap",
    description: "24x7 matrix of peak API requests to the platform",
    group: "trends",
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    defaultVisible: false,
    iconName: "Flame"
  },
  {
    id: "trend_error_volume",
    label: "API Error Rate",
    description: "Fleet-wide error exception rate logged via Sentry",
    group: "trends",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    defaultVisible: false,
    iconName: "AlertTriangle"
  },

  // Group C - SaaS Composition
  {
    id: "donut_plan_distribution",
    label: "Plan Tier Composition",
    description: "Distribution of customer organizations across plans",
    group: "composition",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    defaultVisible: true,
    iconName: "PieChart"
  },
  {
    id: "donut_tenant_statuses",
    label: "Tenant Status Ratios",
    description: "Ratio of Active vs Suspended vs Pending Setup tenants",
    group: "composition",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    defaultVisible: true,
    iconName: "Activity"
  },

  // Group D - Operational Telemetry
  {
    id: "ops_queue_depth",
    label: "Queue Backlog Monitor",
    description: "Live worker queue depths and failed job counters",
    group: "ops",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: true,
    iconName: "Workflow"
  },
  {
    id: "ops_mrr_drift",
    label: "Stripe Sync Drift",
    description: "Subscriptions with discrepant database-to-Stripe sync states",
    group: "ops",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    defaultVisible: false,
    iconName: "RefreshCw"
  },
  {
    id: "ops_db_pool_status",
    label: "Database Pool Status",
    description: "Active Prisma database connection pool metrics",
    group: "ops",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    defaultVisible: false,
    iconName: "Database"
  },

  // Group E - Actionable Workflows
  {
    id: "wf_pending_tickets",
    label: "Support Ticket Queue",
    description: "Active workspace admin support tickets requiring response",
    group: "workflow",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: true,
    iconName: "ListTodo"
  },
  {
    id: "wf_gdpr_requests",
    label: "Pending GDPR Exports",
    description: "Approve or trigger pending user data compliance export requests",
    group: "workflow",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    defaultVisible: false,
    iconName: "ShieldAlert"
  }
];

export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { i: "stat_fleet_active_tenants", x: 0, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_platform_mrr", x: 3, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_fleet_seats", x: 6, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_pending_tickets", x: 9, y: 0, w: 3, h: 2, visible: true },
  { i: "trend_tenant_signups", x: 0, y: 2, w: 6, h: 4, visible: true },
  { i: "trend_mrr_growth", x: 6, y: 2, w: 6, h: 4, visible: true },
  { i: "donut_plan_distribution", x: 0, y: 6, w: 4, h: 4, visible: true },
  { i: "donut_tenant_statuses", x: 4, y: 6, w: 4, h: 4, visible: true },
  { i: "ops_queue_depth", x: 0, y: 10, w: 6, h: 5, visible: true },
  { i: "wf_pending_tickets", x: 6, y: 10, w: 6, h: 5, visible: true },
  { i: "trend_load_heatmap", x: 0, y: 15, w: 12, h: 4, visible: false },
  { i: "trend_error_volume", x: 0, y: 19, w: 6, h: 4, visible: false },
  { i: "ops_mrr_drift", x: 6, y: 19, w: 4, h: 4, visible: false },
  { i: "ops_db_pool_status", x: 0, y: 23, w: 4, h: 4, visible: false },
  { i: "wf_gdpr_requests", x: 4, y: 23, w: 6, h: 4, visible: false }
];

export const WIDGET_ICONS: Record<string, any> = {
  Building2,
  Coins,
  Users,
  Activity,
  TrendingUp,
  Flame,
  AlertTriangle,
  PieChart,
  RefreshCw,
  Database,
  ListTodo,
  ShieldAlert,
  Workflow
};
