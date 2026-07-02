import {
  CreditCard,
  Building2,
  Users,
  Clock,
  DollarSign,
  PieChart as PieIcon,
  Activity,
  BarChart3,
  Contact2,
  Briefcase
} from "lucide-react";

export type WidgetGroup = "kpi" | "org" | "charts" | "table";

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
  { value: "kpi", label: "KPI Stats Cards" },
  { value: "org", label: "Organization Info" },
  { value: "charts", label: "Charts & Analytics" },
  { value: "table", label: "Data Tables" }
];

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: "kpi_plan",
    label: "Subscription Plan",
    description: "Displays current active plan tier and billing status",
    group: "kpi",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "CreditCard"
  },
  {
    id: "kpi_workspaces",
    label: "Total Workspaces",
    description: "Number of active workspaces in organization",
    group: "kpi",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "Building2"
  },
  {
    id: "kpi_seats",
    label: "Seats Utilization",
    description: "Active users count versus plan limits",
    group: "kpi",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "Users"
  },
  {
    id: "org_profile",
    label: "Organization Profile",
    description: "Display name and unique slug/ID identifier",
    group: "org",
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "Contact2"
  },
  {
    id: "kpi_total_hours",
    label: "Total Hours Rollup",
    description: "Total tracked duration inside the selected period",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "Clock"
  },
  {
    id: "kpi_billable_amount",
    label: "Billable Amount Rollup",
    description: "Sum of financial value generated in the period",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "DollarSign"
  },
  {
    id: "kpi_active_members",
    label: "Active Members Rollup",
    description: "Total members logging time during this range",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "Users"
  },
  {
    id: "kpi_active_workspaces",
    label: "Active Workspaces Rollup",
    description: "Count of workspaces active in this range",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "Building2"
  },
  {
    id: "chart_workload",
    label: "Workload Allocation",
    description: "Percentage breakdown donut of workspace hours",
    group: "charts",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
    defaultVisible: true,
    iconName: "PieIcon"
  },
  {
    id: "chart_efficiency",
    label: "Utilisation Efficiency",
    description: "Stacked hours chart of billable vs non-billable",
    group: "charts",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
    defaultVisible: true,
    iconName: "Activity"
  },
  {
    id: "chart_revenue",
    label: "Revenue Generated",
    description: "Bar chart comparing revenue per workspace",
    group: "charts",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
    defaultVisible: true,
    iconName: "BarChart3"
  },
  {
    id: "table_workspace_details",
    label: "Workspace Details Table",
    description: "Rollup drill-down data table of logged metrics",
    group: "table",
    defaultSize: { w: 12, h: 6 },
    minSize: { w: 6, h: 4 },
    defaultVisible: true,
    iconName: "Briefcase"
  }
];

export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { i: "kpi_plan", x: 0, y: 0, w: 4, h: 2, visible: true },
  { i: "kpi_workspaces", x: 4, y: 0, w: 4, h: 2, visible: true },
  { i: "kpi_seats", x: 8, y: 0, w: 4, h: 2, visible: true },
  { i: "org_profile", x: 0, y: 2, w: 12, h: 2, visible: true },
  { i: "kpi_total_hours", x: 0, y: 4, w: 3, h: 2, visible: true },
  { i: "kpi_billable_amount", x: 3, y: 4, w: 3, h: 2, visible: true },
  { i: "kpi_active_members", x: 6, y: 4, w: 3, h: 2, visible: true },
  { i: "kpi_active_workspaces", x: 9, y: 4, w: 3, h: 2, visible: true },
  { i: "chart_workload", x: 0, y: 6, w: 4, h: 5, visible: true },
  { i: "chart_efficiency", x: 4, y: 6, w: 4, h: 5, visible: true },
  { i: "chart_revenue", x: 8, y: 6, w: 4, h: 5, visible: true },
  { i: "table_workspace_details", x: 0, y: 11, w: 12, h: 6, visible: true }
];

export const WIDGET_ICONS: Record<string, any> = {
  CreditCard,
  Building2,
  Users,
  Clock,
  DollarSign,
  PieIcon,
  Activity,
  BarChart3,
  Contact2,
  Briefcase
};
