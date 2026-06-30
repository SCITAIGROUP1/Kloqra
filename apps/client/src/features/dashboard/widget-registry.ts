import {
  Clock,
  DollarSign,
  Folder,
  Calendar,
  PieChart,
  Star,
  History,
  ListTodo,
  Activity,
  Tags,
  Users
} from "lucide-react";

export type WidgetGroup = "kpi" | "trends" | "composition" | "workflow";

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
  { value: "workflow", label: "Quick Actions & Workflows" }
];

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // KPI Stats
  {
    id: "stat_total_hours_today",
    label: "Total Hours (Today)",
    description: "Total duration of time logged today",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "Clock"
  },
  {
    id: "stat_total_hours",
    label: "Total Hours (Week)",
    description: "Total duration of logged time in the selected period",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "Clock"
  },
  {
    id: "stat_billable",
    label: "Billable Hours",
    description: "Total billable duration logged in the current week",
    group: "kpi",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: false,
    iconName: "DollarSign"
  },
  {
    id: "stat_projects",
    label: "Active Projects",
    description: "Number of active projects assigned in this workspace",
    group: "kpi",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "Folder"
  },

  // Trends
  {
    id: "weekly_progress",
    label: "Weekly Progress Chart",
    description: "Bar chart showing daily logged hours vs your daily goal",
    group: "trends",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    defaultVisible: true,
    iconName: "Calendar"
  },

  // Composition
  {
    id: "project_split",
    label: "Project Distribution",
    description: "Donut chart with legend of time logged across projects (name, client, hours, %)",
    group: "composition",
    defaultSize: { w: 7, h: 4 },
    minSize: { w: 6, h: 4 },
    defaultVisible: true,
    iconName: "PieChart"
  },
  {
    id: "category_split",
    label: "Category Split",
    description: "Donut chart of logged hours by work category for the selected period",
    group: "composition",
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 3 },
    defaultVisible: false,
    iconName: "Tags"
  },

  // Workflow & Active Widgets
  {
    id: "quick_timer",
    label: "Quick Timer",
    description: "Fully functional active timer widget to start/stop tracking",
    group: "workflow",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    defaultVisible: true,
    iconName: "Clock"
  },
  {
    id: "daily_progress",
    label: "Daily Progress",
    description: "Goal progress radial ring for today",
    group: "workflow",
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 3 },
    defaultVisible: true,
    iconName: "Activity"
  },
  {
    id: "pinned_favorites",
    label: "Pinned Favorites",
    description: "List of pinned favorite tasks for quick fills",
    group: "workflow",
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 3 },
    defaultVisible: true,
    iconName: "Star"
  },
  {
    id: "recent_activity",
    label: "Recent Activity",
    description: "List of recently logged tasks",
    group: "workflow",
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 3 },
    defaultVisible: true,
    iconName: "History"
  },
  {
    id: "today_logs",
    label: "Today's Activity Feed",
    description: "Interactive timeline of time entries logged today",
    group: "workflow",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    defaultVisible: true,
    iconName: "ListTodo"
  },
  {
    id: "team_activities",
    label: "Team Activities",
    description:
      "Workspace team table with latest activity, duration, time since, period totals, and daily hours bar",
    group: "workflow",
    defaultSize: { w: 12, h: 5 },
    minSize: { w: 8, h: 4 },
    defaultVisible: true,
    iconName: "Users"
  },
  {
    id: "timesheet_submissions",
    label: "My Timesheets",
    description: "Summary of your timesheet submission periods and approval statuses",
    group: "workflow",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    defaultVisible: true,
    iconName: "ListTodo"
  }
];

export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { i: "stat_total_hours_today", x: 0, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_total_hours", x: 3, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_billable", x: 9, y: 0, w: 3, h: 2, visible: false },
  { i: "stat_projects", x: 6, y: 0, w: 3, h: 2, visible: true },
  { i: "weekly_progress", x: 0, y: 6, w: 8, h: 4, visible: true },
  { i: "project_split", x: 5, y: 2, w: 7, h: 4, visible: true },
  { i: "category_split", x: 8, y: 10, w: 4, h: 4, visible: true },
  { i: "quick_timer", x: 0, y: 2, w: 5, h: 4, visible: true },
  { i: "daily_progress", x: 8, y: 6, w: 4, h: 4, visible: true },
  { i: "pinned_favorites", x: 0, y: 6, w: 3, h: 3, visible: false },
  { i: "recent_activity", x: 9, y: 14, w: 3, h: 3, visible: false },
  { i: "today_logs", x: 0, y: 10, w: 8, h: 4, visible: true },
  { i: "team_activities", x: 0, y: 14, w: 12, h: 5, visible: true },
  { i: "timesheet_submissions", x: 6, y: 13, w: 6, h: 3, visible: false }
];

export const WIDGET_ICONS: Record<string, any> = {
  Clock,
  DollarSign,
  Folder,
  Calendar,
  PieChart,
  Star,
  History,
  ListTodo,
  Activity,
  Tags,
  Users
};
