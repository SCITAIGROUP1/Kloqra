"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Legend, XAxis, YAxis } from "recharts";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ProjectColorDot
} from "@chronomint/ui";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@chronomint/ui/chart";
import { DEFAULT_EXPORT_COLUMNS, ROUTES } from "@chronomint/contracts";
import type { DashboardReportDto, ProjectDto, TeamDto } from "@chronomint/contracts";
import {
  DashboardSkeleton,
  EmptyState,
  PageHeader,
  SegmentedControl,
  StatCard
} from "@/components/admin-page";
import { ReportVisualsSection, formatDurationClock } from "@/components/report-charts";
import { api, apiDownloadPost } from "@/lib/api";
import { saveDownloadResponse } from "@/lib/download";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const billableChartConfig = {
  billableHours: { label: "Billable", color: "var(--chart-1)" },
  nonBillableHours: { label: "Non-billable", color: "var(--chart-3)" }
} satisfies ChartConfig;

const revenueChartConfig = {
  billableAmount: { label: "Revenue ($)", color: "var(--chart-2)" }
} satisfies ChartConfig;

type RangeDays = 7 | 30 | 90;

const RANGE_OPTIONS: { value: RangeDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" }
];

function rangeQuery(days: RangeDays, filters?: { projectId?: string; userId?: string }) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString()
  });
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.userId) params.set("userId", filters.userId);
  return params;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [range, setRange] = useState<RangeDays>(7);
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamDto["members"]>([]);
  const [report, setReport] = useState<DashboardReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showMoreCharts, setShowMoreCharts] = useState(false);

  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedMember = teamMembers.find((m) => m.userId === userId);

  const scopeLabel = selectedMember
    ? `${selectedMember.userName} · ${selectedProject!.name}`
    : selectedProject
      ? selectedProject.name
      : "All workspace";

  useEffect(() => {
    if (!ws) return;
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
  }, [ws]);

  useEffect(() => {
    if (!ws || !projectId) {
      setTeamMembers([]);
      setUserId("");
      return;
    }
    api<TeamDto>(ROUTES.PROJECTS.TEAM(projectId), { workspaceId: ws })
      .then((team) => setTeamMembers(team.members))
      .catch(() => setTeamMembers([]));
  }, [ws, projectId]);

  useEffect(() => {
    if (!userId) return;
    if (!teamMembers.some((m) => m.userId === userId)) {
      setUserId("");
    }
  }, [teamMembers, userId]);

  function onProjectChange(nextId: string) {
    setProjectId(nextId);
    setUserId("");
  }

  const load = useCallback(() => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    api<DashboardReportDto>(
      `${ROUTES.REPORTING.DASHBOARD}?${rangeQuery(range, {
        projectId: projectId || undefined,
        userId: userId || undefined
      })}`,
      { workspaceId: ws }
    )
      .then(setReport)
      .catch(() => setError("Could not load analytics. Is the API running on port 3001?"))
      .finally(() => setLoading(false));
  }, [ws, range, projectId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function quickExport() {
    if (!ws) return;
    setExporting(true);
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - range);
      const res = await apiDownloadPost(ROUTES.EXPORT.GENERATE, ws, {
        from: from.toISOString(),
        to: to.toISOString(),
        billable: "all",
        reportTypes: ["time_entries", "by_project"],
        format: "xlsx",
        columns: {
          time_entries: [...DEFAULT_EXPORT_COLUMNS.time_entries],
          by_project: [...DEFAULT_EXPORT_COLUMNS.by_project]
        },
        ...(projectId ? { projectId } : {}),
        ...(userId ? { userId } : {})
      });
      await saveDownloadResponse(res, "chronomint-dashboard-export.xlsx");
    } catch {
      setError("Quick export failed.");
    } finally {
      setExporting(false);
    }
  }

  const customizeHref = (() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - range);
    const params = new URLSearchParams({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10)
    });
    return `/exports?${params}`;
  })();

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Reports" description="Loading workspace analytics…" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-8">
        <PageHeader title="Reports" description="Workspace time and revenue overview." />
        <EmptyState
          title="Could not load reports"
          description={error ?? "No data returned from the API."}
          action={
            <Button variant="outline" onClick={load}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const colorByProjectId = Object.fromEntries(projects.map((p) => [p.id, p.color]));
  const hasData = report.workspace.totalHours > 0;
  const periodLabel = `${formatDate(report.period.from)} – ${formatDate(report.period.to)}`;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        description={
          <>
            {scopeLabel} · {periodLabel}
            {selectedProject?.clientName && !selectedMember ? ` · ${selectedProject.clientName}` : null}
          </>
        }
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={quickExport} disabled={exporting}>
              {exporting ? "Exporting…" : "Quick export"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={customizeHref}>Full export</Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 min-w-[200px]">
              <Label className="text-xs font-medium text-muted-foreground">Period</Label>
              <SegmentedControl value={range} onChange={setRange} options={RANGE_OPTIONS} />
            </div>
            <div className="space-y-2 min-w-[200px]">
              <Label className="text-xs font-medium text-muted-foreground">Project</Label>
              <Select
                value={projectId || "__all__"}
                onValueChange={(v) => onProjectChange(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <ProjectColorDot color={p.color} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[200px]">
              <Label className="text-xs font-medium text-muted-foreground">Team member</Label>
              {projectId ? (
                <Select
                  value={userId || "__all__"}
                  onValueChange={(v) => setUserId(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Everyone on project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Everyone on project</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.userName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="flex h-9 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground">
                  Pick a project to filter by member
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <EmptyState
          title="No time in this period"
          description="Log time in the client app or seed demo data to see charts and breakdowns."
          action={
            <code className="rounded-md bg-muted px-2 py-1 text-xs">pnpm prisma:seed</code>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard
              label="Total hours"
              value={formatDurationClock(report.workspace.totalHours)}
              hint={`${report.workspace.activeMembers} members active`}
            />
            <StatCard
              label="Billable"
              value={formatDurationClock(report.workspace.billableHours)}
              hint={`${report.workspace.billablePercent}% of total`}
              accent="billable"
            />
            <StatCard
              label="Non-billable"
              value={formatDurationClock(report.workspace.nonBillableHours)}
              accent="muted"
            />
            <StatCard
              label="Revenue"
              value={`$${formatMoney(report.workspace.totalAmount)}`}
              hint={report.workspace.currency}
              accent="revenue"
            />
            <StatCard
              label="Projects"
              value={String(report.workspace.activeProjects)}
              hint="With time logged"
            />
            <StatCard
              label="Members"
              value={String(report.workspace.activeMembers)}
              hint="With time logged"
            />
          </div>

          <ReportVisualsSection report={report} projectColors={colorByProjectId} />

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoreCharts((v) => !v)}
              className="text-muted-foreground"
            >
              {showMoreCharts ? "Hide additional charts" : "Show weekly, revenue & member charts"}
            </Button>
          </div>

          {showMoreCharts ? (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Weekly breakdown</CardTitle>
                    <CardDescription>Billable vs non-billable by week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.weeklyHours.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No weekly data</p>
                    ) : (
                      <ChartContainer config={billableChartConfig} className="min-h-[260px] w-full">
                        <BarChart data={report.weeklyHours} accessibilityLayer>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis
                            dataKey="weekStart"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(v) => formatDate(`${v}T12:00:00Z`)}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="billableHours" stackId="w" fill="var(--color-billableHours)" />
                          <Bar
                            dataKey="nonBillableHours"
                            stackId="w"
                            fill="var(--color-nonBillableHours)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Revenue by project</CardTitle>
                    <CardDescription>Billable amount in period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.timeByProject.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No project revenue</p>
                    ) : (
                      <ChartContainer config={revenueChartConfig} className="min-h-[260px] w-full">
                        <BarChart data={report.timeByProject} accessibilityLayer>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis
                            dataKey="projectName"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="billableAmount" radius={4}>
                            {report.timeByProject.map((entry) => (
                              <Cell
                                key={entry.projectId}
                                fill={
                                  colorByProjectId[entry.projectId] ?? "var(--color-billableAmount)"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hours by member</CardTitle>
                  <CardDescription>Stacked billable and non-billable hours</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.timeByUser.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No member data</p>
                  ) : (
                    <ChartContainer config={billableChartConfig} className="min-h-[300px] w-full">
                      <BarChart data={report.timeByUser} accessibilityLayer>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="userName"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="billableHours" stackId="a" fill="var(--color-billableHours)" />
                        <Bar
                          dataKey="nonBillableHours"
                          stackId="a"
                          fill="var(--color-nonBillableHours)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
