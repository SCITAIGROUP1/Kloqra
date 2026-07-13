import {
  COMMERCIAL_DASHBOARD_WIDGET_IDS,
  isClientCommercialFeaturesEnabled
} from "@kloqra/web-shared";
import {
  Clock,
  DollarSign,
  Folder,
  Users,
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Flame,
  ShieldAlert,
  Percent,
  Briefcase,
  UserCheck,
  Coins,
  Sparkles,
  ListTodo,
  Tags
} from "lucide-react";

export type WidgetGroup = "kpi" | "trends" | "composition" | "projects" | "team" | "workflow";

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
  i: string; // matches react-grid-layout's format
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

export const WIDGET_GROUPS: { value: WidgetGroup; label: string }[] = [
  { value: "kpi", label: "KPI Stat Cards" },
  { value: "trends", label: "Time & Trends" },
  { value: "composition", label: "Composition" },
  { value: "projects", label: "Project Analytics" },
  { value: "team", label: "Team & People" },
  { value: "workflow", label: "Quick Actions & Workflows" }
];

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // Group A - KPI Stat Cards
  {
    id: "stat_total_hours",
    label: "Total Hours",
    description: "Total duration of logged time in selected period",
    group: "kpi",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "Clock"
  },
  {
    id: "stat_billable",
    label: "Billable Hours",
    description: "Total billable duration and percentage",
    group: "kpi",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "DollarSign"
  },
  {
    id: "stat_nonbillable",
    label: "Non-Billable",
    description: "Total non-billable hours logged",
    group: "kpi",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: false,
    iconName: "Clock"
  },
  {
    id: "stat_revenue",
    label: "Revenue",
    description: "Total billable amount earned in period",
    group: "kpi",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: false,
    iconName: "Coins"
  },
  {
    id: "stat_projects",
    label: "Active Projects",
    description: "Count of projects with time logged",
    group: "kpi",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "Folder"
  },
  {
    id: "stat_members",
    label: "Active Members",
    description: "Count of team members with time logged",
    group: "kpi",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "Users"
  },
  {
    id: "active_timers",
    label: "Live Active Timers",
    description: "Count of team members currently tracking time",
    group: "kpi",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: false,
    iconName: "Activity"
  },

  // Group B - Time & Trend Charts
  {
    id: "daily_chart",
    label: "Daily Time Chart",
    description: "Stacked bar chart of hours logged daily",
    group: "trends",
    defaultSize: { w: 12, h: 5 },
    minSize: { w: 6, h: 4 },
    defaultVisible: false,
    iconName: "Calendar"
  },
  {
    id: "weekly_chart",
    label: "Weekly Activity",
    description: "Daily hours logged across the selected period",
    group: "trends",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: true,
    iconName: "BarChart3"
  },
  {
    id: "revenue_trend",
    label: "Revenue Trend",
    description: "Cumulative revenue weekly trend line",
    group: "trends",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 4 },
    defaultVisible: false,
    iconName: "TrendingUp"
  },
  {
    id: "time_of_day_heatmap",
    label: "Time of Day Heatmap",
    description: "24x7 matrix of hours logged by weekday and hour",
    group: "trends",
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 6, h: 4 },
    defaultVisible: false,
    iconName: "Flame"
  },

  // Group C - Composition
  {
    id: "distribution_donut",
    label: "Distribution Donut",
    description: "Hours distribution across projects or users",
    group: "composition",
    defaultSize: { w: 5, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: true,
    iconName: "PieChart"
  },
  {
    id: "billable_split_donut",
    label: "Billable Split",
    description: "Quick donut chart of billable vs non-billable hours",
    group: "composition",
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 3, h: 3 },
    defaultVisible: false,
    iconName: "Percent"
  },
  {
    id: "billability_gauge",
    label: "Billability Gauge",
    description: "Workspace-wide billability percentage radial gauge",
    group: "composition",
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 3, h: 3 },
    defaultVisible: false,
    iconName: "Percent"
  },
  {
    id: "task_breakdown",
    label: "Task Breakdown",
    description: "Hours logged grouped by task name",
    group: "composition",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: false,
    iconName: "PieChart"
  },
  {
    id: "category_distribution",
    label: "Category Distribution",
    description: "Hours distribution across work categories",
    group: "composition",
    defaultSize: { w: 5, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: true,
    iconName: "Tags"
  },
  {
    id: "category_breakdown",
    label: "Category Breakdown",
    description: "Time breakdown table by work category",
    group: "composition",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 5, h: 4 },
    defaultVisible: false,
    iconName: "Tags"
  },
  {
    id: "category_project_heatmap",
    label: "Category × Project Heatmap",
    description: "Matrix of hours at category and project intersections",
    group: "composition",
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 6, h: 4 },
    defaultVisible: false,
    iconName: "Tags"
  },

  // Group D - Project Analytics
  {
    id: "budget_burndown",
    label: "Budget Burn-Down",
    description: "Budget capacity progress and alert status",
    group: "projects",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    defaultVisible: true,
    iconName: "Briefcase"
  },
  {
    id: "revenue_by_project",
    label: "Revenue by Project",
    description: "Bar chart comparing billing revenue per project",
    group: "projects",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: false,
    iconName: "Coins"
  },
  {
    id: "project_health",
    label: "Project Health Matrix",
    description: "Hours, budget progress, and revenue comparison",
    group: "projects",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: false,
    iconName: "ShieldAlert"
  },
  {
    id: "rate_efficiency",
    label: "Rate Efficiency",
    description: "Scatter bubble chart of hours vs revenue vs billability",
    group: "projects",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 5, h: 4 },
    defaultVisible: false,
    iconName: "Sparkles"
  },

  // Group E - Team & People
  {
    id: "team_utilization",
    label: "Team Utilization",
    description: "Member utilization progress vs expectations",
    group: "team",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 5, h: 3 },
    defaultVisible: true,
    iconName: "Users"
  },
  {
    id: "hours_by_member",
    label: "Hours by Member",
    description: "Stacked hours per team member",
    group: "team",
    defaultSize: { w: 12, h: 5 },
    minSize: { w: 6, h: 4 },
    defaultVisible: false,
    iconName: "BarChart3"
  },
  {
    id: "breakdown_table",
    label: "Breakdown Table",
    description: "Time breakdown per project and user in a table",
    group: "team",
    defaultSize: { w: 7, h: 5 },
    minSize: { w: 5, h: 4 },
    defaultVisible: true,
    iconName: "Briefcase"
  },
  {
    id: "member_leaderboard",
    label: "Member Leaderboard",
    description: "Leaderboard of team members by total logged hours",
    group: "team",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
    defaultVisible: false,
    iconName: "UserCheck"
  },
  {
    id: "hourly_rates",
    label: "Hourly Rate Overview",
    description: "Global, project, and user billing rate mappings",
    group: "team",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 4, h: 3 },
    defaultVisible: false,
    iconName: "Coins"
  },

  // Group F - Live & Workflow
  {
    id: "live_presence",
    label: "Live Presence Feed",
    description: "Real-time list of currently active timers",
    group: "workflow",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    defaultVisible: false,
    iconName: "Activity"
  },
  {
    id: "pending_timesheets",
    label: "Pending Approvals",
    description: "Quick approve/reject actions for pending timesheets",
    group: "workflow",
    defaultSize: { w: 5, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: false,
    iconName: "ListTodo"
  }
];

export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { i: "stat_total_hours", x: 4, y: 0, w: 4, h: 2, visible: true },
  { i: "stat_billable", x: 0, y: 0, w: 2, h: 2, visible: true },
  { i: "stat_nonbillable", x: 2, y: 0, w: 2, h: 2, visible: true },
  { i: "stat_revenue", x: 2, y: 0, w: 2, h: 2, visible: false },
  { i: "stat_projects", x: 8, y: 0, w: 2, h: 2, visible: true },
  { i: "stat_members", x: 10, y: 0, w: 2, h: 2, visible: true },
  { i: "active_timers", x: 0, y: 2, w: 2, h: 2, visible: false },
  { i: "daily_chart", x: 0, y: 7, w: 12, h: 6, visible: true },
  { i: "weekly_chart", x: 0, y: 2, w: 7, h: 5, visible: true },
  { i: "revenue_trend", x: 6, y: 11, w: 6, h: 4, visible: false },
  { i: "time_of_day_heatmap", x: 0, y: 16, w: 8, h: 4, visible: false },
  { i: "distribution_donut", x: 7, y: 13, w: 5, h: 4, visible: true },
  { i: "billable_split_donut", x: 0, y: 16, w: 3, h: 4, visible: false },
  { i: "billability_gauge", x: 3, y: 16, w: 3, h: 4, visible: false },
  { i: "task_breakdown", x: 6, y: 22, w: 4, h: 5, visible: false },
  { i: "category_distribution", x: 0, y: 21, w: 5, h: 5, visible: false },
  { i: "category_breakdown", x: 5, y: 21, w: 7, h: 5, visible: false },
  { i: "category_project_heatmap", x: 0, y: 13, w: 7, h: 4, visible: true },
  { i: "budget_burndown", x: 6, y: 2, w: 6, h: 5, visible: false },
  { i: "revenue_by_project", x: 0, y: 21, w: 6, h: 5, visible: false },
  { i: "project_health", x: 6, y: 21, w: 6, h: 5, visible: false },
  { i: "rate_efficiency", x: 0, y: 26, w: 6, h: 5, visible: false },
  { i: "team_utilization", x: 7, y: 2, w: 5, h: 5, visible: true },
  { i: "hours_by_member", x: 0, y: 31, w: 12, h: 5, visible: false },
  { i: "breakdown_table", x: 0, y: 11, w: 7, h: 5, visible: false },
  { i: "member_leaderboard", x: 0, y: 36, w: 4, h: 5, visible: false },
  { i: "hourly_rates", x: 4, y: 36, w: 4, h: 4, visible: false },
  { i: "live_presence", x: 8, y: 36, w: 4, h: 4, visible: false },
  { i: "pending_timesheets", x: 0, y: 17, w: 12, h: 5, visible: true }
];

export const WIDGET_ICONS: Record<string, any> = {
  Clock,
  DollarSign,
  Folder,
  Users,
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Flame,
  ShieldAlert,
  Percent,
  Briefcase,
  UserCheck,
  Coins,
  Sparkles,
  ListTodo,
  Tags
};

const commercialIds = new Set<string>(COMMERCIAL_DASHBOARD_WIDGET_IDS);

/** Registry/layout filtered for the current commercial-features flag (build-time env). */
export const ACTIVE_WIDGET_REGISTRY: WidgetDefinition[] = isClientCommercialFeaturesEnabled()
  ? WIDGET_REGISTRY
  : WIDGET_REGISTRY.filter((w) => !commercialIds.has(w.id));

export const ACTIVE_DEFAULT_LAYOUT: WidgetLayoutItem[] = isClientCommercialFeaturesEnabled()
  ? DEFAULT_LAYOUT
  : DEFAULT_LAYOUT.filter((item) => !commercialIds.has(item.i));
