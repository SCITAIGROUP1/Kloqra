"use client";

import { ROUTES, resolveEffectiveTimezone } from "@kloqra/contracts";
import type {
  CategoryDto,
  ProjectDto,
  TaskDto,
  TeamMembersOverviewDto,
  UserProfileDto
} from "@kloqra/contracts";
import { AppBar } from "@kloqra/ui";
import { api as sharedApi, fetchListItems, fetchProjectTeam } from "@kloqra/web-shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TimesheetDisplayFormat } from "./display-format";
import { groupLogsByWeek } from "./group-logs-by-week";
import type { BillabilityFilter } from "./time-tracker-filters-panel";
import {
  inclusiveDateKeysFromPeriod,
  matchTimeTrackerPeriod,
  periodLabelForSelection,
  resolveTimeTrackerDateRange,
  type TimeTrackerPeriodSelection
} from "./time-tracker-period";
import { TimeTrackerStatCards } from "./time-tracker-stat-cards";
import { computeTimeTrackerStats } from "./time-tracker-stats";
import { TimeTrackerToolbar } from "./time-tracker-toolbar";
import { AdminTimeTrackerWeekList, formatVisibleWeeksSummary } from "./time-tracker-week-list";
import { useTimeTrackerLogs } from "./use-time-tracker-logs";
import { api } from "@/lib/api";
import { colorForTask } from "@/lib/project-color-styles";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function AdminTimeTrackerPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [displayFormat, setDisplayFormat] = useState<TimesheetDisplayFormat | null>(null);
  const [weekStartPref, setWeekStartPref] = useState<"monday" | "sunday">("monday");

  useEffect(() => {
    if (!ws) return;
    sharedApi<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws })
      .then((profile) => {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezone = resolveEffectiveTimezone(profile.preferences, browserTz);
        setWeekStartPref(profile.preferences.weekStart ?? "monday");
        setDisplayFormat({
          timezone,
          dateFormat: profile.effectiveDateFormat,
          timeFormat: profile.effectiveTimeFormat
        });
      })
      .catch(() => {});
  }, [ws]);

  const timezone = displayFormat?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [allMembers, setAllMembers] = useState<{ userId: string; userName: string }[]>([]);
  const [projectMembers, setProjectMembers] = useState<{ userId: string; userName: string }[]>([]);

  const [period, setPeriod] = useState<TimeTrackerPeriodSelection>("this_week");
  const [rangeFrom, setRangeFrom] = useState(
    () => inclusiveDateKeysFromPeriod("this_week", "UTC").from
  );
  const [rangeTo, setRangeTo] = useState(() => inclusiveDateKeysFromPeriod("this_week", "UTC").to);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [billability, setBillability] = useState<BillabilityFilter>("all");
  const [memberFilter, setMemberFilter] = useState<string[]>([]);

  useEffect(() => {
    if (period === "custom") return;
    const keys = inclusiveDateKeysFromPeriod(period, timezone, weekStartPref);
    setRangeFrom(keys.from);
    setRangeTo(keys.to);
  }, [period, timezone, weekStartPref]);

  const visibleRange = useMemo(
    () => resolveTimeTrackerDateRange(rangeFrom, rangeTo, timezone),
    [rangeFrom, rangeTo, timezone]
  );

  const periodLabel = useMemo(
    () => periodLabelForSelection(period, rangeFrom, rangeTo, timezone),
    [period, rangeFrom, rangeTo, timezone]
  );

  function handlePeriodChange(next: TimeTrackerPeriodSelection) {
    setPeriod(next);
    if (next === "custom") return;
    const keys = inclusiveDateKeysFromPeriod(next, timezone, weekStartPref);
    setRangeFrom(keys.from);
    setRangeTo(keys.to);
  }

  function handleRangeChange(from: string, to: string) {
    setRangeFrom(from);
    setRangeTo(to);
    setPeriod(matchTimeTrackerPeriod(from, to, timezone, weekStartPref));
  }

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const serverFilters = useMemo(
    () => ({
      from: visibleRange.from,
      to: visibleRange.to,
      projectId: projectFilter.length > 0 ? projectFilter : undefined,
      categoryId: categoryFilter || undefined,
      taskId: taskFilter || undefined,
      search: debouncedSearch || undefined,
      billableOnly: billability === "billable" || undefined,
      userId: memberFilter.length > 0 ? memberFilter : undefined
    }),
    [
      visibleRange,
      projectFilter,
      categoryFilter,
      taskFilter,
      debouncedSearch,
      billability,
      memberFilter
    ]
  );

  const { logs, loading: logsLoading, error: logsError } = useTimeTrackerLogs(ws, serverFilters);

  const [weeksPerPage, setWeeksPerPage] = useState(1);
  const [page, setPage] = useState(1);

  const filterResetKey = useMemo(
    () =>
      JSON.stringify({
        from: serverFilters.from.toISOString(),
        to: serverFilters.to.toISOString(),
        projectId: serverFilters.projectId ?? "",
        categoryId: serverFilters.categoryId ?? "",
        taskId: serverFilters.taskId ?? "",
        search: serverFilters.search ?? "",
        billableOnly: serverFilters.billableOnly ?? false,
        userId: serverFilters.userId ?? ""
      }),
    [serverFilters]
  );

  useEffect(() => {
    setPage(1);
  }, [filterResetKey]);

  const allWeekGroups = useMemo(
    () => groupLogsByWeek(logs, timezone, weekStartPref),
    [logs, timezone, weekStartPref]
  );

  const totalWeekCount = allWeekGroups.length;
  const totalWeekPages = Math.max(1, Math.ceil(totalWeekCount / weeksPerPage));

  useEffect(() => {
    if (page > totalWeekPages) {
      setPage(totalWeekPages);
    }
  }, [page, totalWeekPages]);

  const visibleWeekGroups = useMemo(() => {
    const start = (page - 1) * weeksPerPage;
    return allWeekGroups.slice(start, start + weeksPerPage);
  }, [allWeekGroups, page, weeksPerPage]);

  const weekTotals = useMemo(() => {
    const map = new Map<string, { totalSec: number; billableSec: number }>();
    for (const group of allWeekGroups) {
      map.set(group.weekKey, { totalSec: group.totalSec, billableSec: group.billableSec });
    }
    return map;
  }, [allWeekGroups]);

  const weekRangeSummary = useMemo(
    () => formatVisibleWeeksSummary(visibleWeekGroups, timezone),
    [visibleWeekGroups, timezone]
  );

  const setWeeksPerPageAndResetPage = useCallback((next: number) => {
    setWeeksPerPage(next);
    setPage(1);
  }, []);

  useEffect(() => {
    if (!ws) return;
    fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks);
    fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, { workspaceId: ws }).then(setCategories);

    api<TeamMembersOverviewDto>(`${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(ws)}?page=1&limit=200`, {
      workspaceId: ws
    })
      .then((res) => {
        setAllMembers(
          (res.members ?? []).map((m) => ({
            userId: m.userId,
            userName: m.userName
          }))
        );
      })
      .catch(() => {
        setAllMembers([]);
      });
  }, [ws]);

  useEffect(() => {
    if (!ws || projectFilter.length === 0) {
      setProjectMembers([]);
      return;
    }

    Promise.all(
      projectFilter.map((id) =>
        fetchProjectTeam(id, { workspaceId: ws })
          .then((res) => res.members ?? [])
          .catch(() => [])
      )
    ).then((teamsMembersLists) => {
      const uniqueMembersMap = new Map<string, { userId: string; userName: string }>();
      for (const list of teamsMembersLists) {
        for (const m of list) {
          uniqueMembersMap.set(m.userId, { userId: m.userId, userName: m.userName });
        }
      }
      setProjectMembers([...uniqueMembersMap.values()]);
    });
  }, [ws, projectFilter]);

  const members = useMemo(() => {
    return projectFilter.length > 0 ? projectMembers : allMembers;
  }, [projectFilter, projectMembers, allMembers]);

  useEffect(() => {
    if (memberFilter.length === 0) return;
    const validMemberIds = memberFilter.filter((id) => members.some((m) => m.userId === id));
    if (validMemberIds.length !== memberFilter.length) {
      setMemberFilter(validMemberIds);
    }
  }, [members, memberFilter]);

  const memberMap = useMemo(
    () => new Map(allMembers.map((m) => [m.userId, m.userName])),
    [allMembers]
  );

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.userId, label: m.userName })),
    [members]
  );

  const entryColor = useCallback(
    (taskId: string) => colorForTask(taskId, tasks, projects),
    [tasks, projects]
  );

  const stats = useMemo(
    () => computeTimeTrackerStats(logs, periodLabel, projects, tasks, new Map()),
    [logs, periodLabel, projects, tasks]
  );

  const filtersPending = search.trim() !== debouncedSearch;

  function clearFilters() {
    setCategoryFilter("");
    setTaskFilter("");
    setBillability("all");
  }

  return (
    <div className="space-y-6">
      <AppBar title="Time Tracker" description="View time entries for all workspace members." />

      <TimeTrackerToolbar
        search={search}
        onSearchChange={setSearch}
        projectId={projectFilter}
        onProjectChange={setProjectFilter}
        period={period}
        onPeriodChange={handlePeriodChange}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onRangeChange={handleRangeChange}
        weekStartsOn={weekStartPref === "sunday" ? 0 : 1}
        projects={projects}
        categories={categories}
        tasks={tasks}
        workspaceNamesById={{}}
        filterValues={{
          categoryId: categoryFilter,
          taskId: taskFilter,
          billability
        }}
        onCategoryChange={setCategoryFilter}
        onTaskChange={setTaskFilter}
        onBillabilityChange={setBillability}
        onClearFilters={clearFilters}
        memberFilter={memberFilter}
        onMemberChange={setMemberFilter}
        members={memberOptions}
      />

      <TimeTrackerStatCards stats={stats} loading={logsLoading || filtersPending} />

      {logsError ? <p className="text-sm text-destructive">{logsError}</p> : null}

      <AdminTimeTrackerWeekList
        groups={visibleWeekGroups}
        weekTotals={weekTotals}
        tasks={tasks}
        projects={projects}
        workspaceNamesById={{}}
        entryColor={entryColor}
        memberMap={memberMap}
        timezone={timezone}
        weekStartPref={weekStartPref}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        loading={logsLoading || filtersPending}
        page={page}
        weeksPerPage={weeksPerPage}
        onWeeksPerPageChange={setWeeksPerPageAndResetPage}
        onPageChange={setPage}
        totalWeekPages={totalWeekPages}
        totalWeekCount={totalWeekCount}
        weekRangeSummary={weekRangeSummary}
      />
    </div>
  );
}
