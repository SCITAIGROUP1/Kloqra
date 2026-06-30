"use client";

import type {
  DashboardReportDto,
  PublicWidgetShareViewDto,
  UtilizationResponseDto
} from "@kloqra/contracts";
import { isUtilizationWidgetShare } from "@kloqra/contracts";
import { Card, CardContent } from "@kloqra/ui";
import { Clock, DollarSign, Folder, Users } from "lucide-react";
import { TeamUtilizationTable, TeamUtilizationTargetBadge } from "./team-utilization-table";
import {
  BillabilityGaugeWidget,
  BillableSplitDonutWidget,
  MemberLeaderboardWidget,
  ProjectHealthWidget,
  RevenueTrendWidget
} from "./widgets-lazy";
import {
  DailyStackedBarChart,
  HoursByMemberChart,
  ReportBreakdownTable,
  ReportDonutChart,
  RevenueByProjectChart,
  WeeklyActivityChart
} from "@/components/charts-lazy";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { formatDurationClock } from "@/components/report-charts";

type ChartByMode = "billability" | "project";
type GroupByMode = "user" | "project" | "category";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function projectColorsFromReport(report: DashboardReportDto): Record<string, string> {
  return Object.fromEntries(
    report.timeByProject.map((p, i) => [p.projectId, `hsl(${(i * 47) % 360} 70% 50%)`])
  );
}

export function PublicWidgetView({ data }: { data: PublicWidgetShareViewDto }) {
  if (isUtilizationWidgetShare(data)) {
    const utilization = data.payload as UtilizationResponseDto;
    return (
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="space-y-3 p-4 min-h-[280px]">
          <div className="flex justify-end">
            <TeamUtilizationTargetBadge data={utilization} />
          </div>
          <TeamUtilizationTable data={utilization} showPagination={false} />
        </CardContent>
      </Card>
    );
  }

  const report = data.payload as DashboardReportDto;
  const projectColors = projectColorsFromReport(report);
  const chartBy = (data.options?.chartBy as ChartByMode | undefined) ?? "billability";
  const groupBy = (data.options?.groupBy as GroupByMode | undefined) ?? "user";

  function renderWidget() {
    switch (data.widgetId) {
      case "stat_total_hours":
        return (
          <DashboardStatCard
            label="Total Hours"
            value={formatDurationClock(report.workspace.totalHours)}
            hint={`${report.workspace.activeMembers} members active`}
            icon={Clock}
            tone="primary"
          />
        );
      case "stat_billable":
        return (
          <DashboardStatCard
            label="Billable Hours"
            value={formatDurationClock(report.workspace.billableHours)}
            hint={`${report.workspace.billablePercent}% of total`}
            icon={DollarSign}
            tone="success"
          />
        );
      case "stat_nonbillable":
        return (
          <DashboardStatCard
            label="Non-Billable"
            value={formatDurationClock(report.workspace.nonBillableHours)}
            icon={Clock}
            tone="warning"
          />
        );
      case "stat_revenue":
        return (
          <DashboardStatCard
            label="Revenue"
            value={`$${formatMoney(report.workspace.totalAmount)}`}
            hint={report.workspace.currency}
            icon={DollarSign}
            tone="premium"
          />
        );
      case "stat_projects":
        return (
          <DashboardStatCard
            label="Active Projects"
            value={String(report.workspace.activeProjects)}
            icon={Folder}
            tone="primary"
          />
        );
      case "stat_members":
        return (
          <DashboardStatCard
            label="Active Members"
            value={String(report.workspace.activeMembers)}
            icon={Users}
            tone="primary"
          />
        );
      case "daily_chart":
        return (
          <DailyStackedBarChart report={report} chartBy={chartBy} projectColors={projectColors} />
        );
      case "weekly_chart":
        return <WeeklyActivityChart report={report} />;
      case "revenue_by_project":
        return <RevenueByProjectChart report={report} projectColors={projectColors} />;
      case "hours_by_member":
        return <HoursByMemberChart report={report} />;
      case "breakdown_table":
        return (
          <ReportBreakdownTable report={report} groupBy={groupBy} projectColors={projectColors} />
        );
      case "distribution_donut":
        return <ReportDonutChart report={report} groupBy={groupBy} projectColors={projectColors} />;
      case "category_distribution":
        return (
          <ReportDonutChart report={report} groupBy="category" projectColors={projectColors} />
        );
      case "category_breakdown":
        return (
          <ReportBreakdownTable report={report} groupBy="category" projectColors={projectColors} />
        );
      case "billability_gauge":
        return <BillabilityGaugeWidget report={report} />;
      case "revenue_trend":
        return <RevenueTrendWidget report={report} />;
      case "project_health":
        return <ProjectHealthWidget report={report} />;
      case "member_leaderboard":
        return <MemberLeaderboardWidget report={report} />;
      case "billable_split_donut":
        return <BillableSplitDonutWidget report={report} />;
      default:
        return (
          <p className="text-sm text-muted-foreground p-6 text-center">
            This widget type cannot be displayed in a shared view.
          </p>
        );
    }
  }

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardContent className="p-4 min-h-[280px]">{renderWidget()}</CardContent>
    </Card>
  );
}
