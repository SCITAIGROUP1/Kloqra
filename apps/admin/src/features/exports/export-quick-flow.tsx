"use client";

import {
  DEFAULT_EXPORT_COLUMNS,
  type ExportBodyDto,
  type ExportPreviewBodyDto,
  type ExportPreviewResponseDto,
  type CategoryDto,
  type ProjectDto,
  type TaskDto,
  type ExportReportType,
  type WorkspaceMemberDto
} from "@kloqra/contracts";
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
  SelectValue
} from "@kloqra/ui";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { ExportDownloadPanel } from "./export-download-panel";
import { ExportOrganizePicker } from "./export-organize-picker";
import { ExportPeriodFilter } from "./export-period-filter";
import {
  getVisibleExportScenarios,
  getExportScenario,
  type ExportScenario,
  type ExportScenarioId
} from "./export-scenarios";
import { ExportScopeFilters } from "./export-scope-filters";
import { isClientCommercialFeaturesEnabled } from "@/lib/client-commercial-features";
import { toDateInputValue, formatExportPeriodLabel } from "@/lib/export-date-presets";
import { describeOrganize, type ExportOrganizePreset } from "@/lib/export-organize";
import { applyOrganizePreset } from "@/lib/export-organize";
import { sheetLayoutRequiresTimeEntries } from "@/lib/export-sheet-layout";

const STEPS = ["What do you need?", "When?", "Who & projects", "Preview & download"] as const;

const POPULAR_SCENARIOS = new Set<ExportScenarioId>(["payroll", "team_summary", "missing_time"]);

function defaultColumnsForReports(reportTypes: ExportReportType[]) {
  const out: Partial<Record<ExportReportType, string[]>> = {};
  for (const rt of reportTypes) {
    const defaults = DEFAULT_EXPORT_COLUMNS[rt];
    if (defaults) out[rt] = [...defaults];
  }
  return out;
}

export type ExportQuickFlowProps = {
  workspaceId: string;
  workspaceSlug: string;
  from: string;
  to: string;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
  projectIds: string[];
  userIds: string[];
  categoryId: string;
  taskId: string;
  teamOnly: boolean;
  onProjectIdsChange: (ids: string[]) => void;
  onUserIdsChange: (ids: string[]) => void;
  onCategoryChange: (id: string) => void;
  onTaskChange: (id: string) => void;
  onTeamOnlyChange: (teamOnly: boolean) => void;
  onClearScope: () => void;
  projects: ProjectDto[];
  categories: CategoryDto[];
  tasks: TaskDto[];
  members: WorkspaceMemberDto[];
  preview: ExportPreviewResponseDto | null;
  previewLoading: boolean;
  previewError: string | null;
  onPreviewBodyChange: (body: ExportPreviewBodyDto) => void;
  initialScenarioId?: ExportScenarioId | null;
  onJobCreated?: () => void;
  /** User's IANA timezone preference — sent to the server so exported dates match the UI. */
  timezone?: string;
};

export function ExportQuickFlow({
  workspaceId,
  workspaceSlug,
  from,
  to,
  onFromChange,
  onToChange,
  projectIds,
  userIds,
  categoryId,
  taskId,
  teamOnly,
  onProjectIdsChange,
  onUserIdsChange,
  onCategoryChange,
  onTaskChange,
  onTeamOnlyChange,
  onClearScope,
  projects,
  categories,
  tasks,
  members,
  preview,
  previewLoading,
  previewError,
  onPreviewBodyChange,
  initialScenarioId,
  onJobCreated,
  timezone
}: ExportQuickFlowProps) {
  const scenarios = useMemo(
    () => getVisibleExportScenarios(isClientCommercialFeaturesEnabled()),
    []
  );
  const [step, setStep] = useState(0);
  const [scenarioId, setScenarioId] = useState<ExportScenarioId | null>(initialScenarioId ?? null);
  const [organizePreset, setOrganizePreset] = useState<ExportOrganizePreset>(
    "person_sheets_chronological"
  );
  const [showOrganize, setShowOrganize] = useState(false);
  const [format, setFormat] = useState<ExportBodyDto["format"]>("xlsx");
  const [billable, setBillable] = useState<ExportBodyDto["billable"]>("all");

  const scenario = useMemo(() => (scenarioId ? getExportScenario(scenarioId) : null), [scenarioId]);

  useEffect(() => {
    if (!initialScenarioId) return;
    const s = getExportScenario(initialScenarioId);
    selectScenario(s);
  }, [initialScenarioId]);

  function selectScenario(next: ExportScenario) {
    setScenarioId(next.id);
    setOrganizePreset(next.defaultOrganizePreset);
    setFormat(next.format);
    setBillable(next.billable);
  }

  function handleResetFilters() {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    onFromChange(toDateInputValue(d));
    onToChange(toDateInputValue(new Date()));
    onClearScope();
    setBillable("all");
    toast.success("Filters reset to defaults");
  }

  const organize = useMemo(() => applyOrganizePreset(organizePreset), [organizePreset]);

  const exportBody = useMemo((): ExportBodyDto | null => {
    if (!scenario) return null;
    return {
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
      billable,
      reportTypes: scenario.reportTypes,
      format,
      groupBy: organize.groupBy,
      sheetLayout: organize.sheetLayout,
      columns: defaultColumnsForReports(scenario.reportTypes),
      exportPurpose: scenario.purposeSlug,
      ...(timezone ? { timezone } : {}),
      ...(projectIds.length ? { projectIds } : {}),
      ...(userIds.length ? { userIds } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(taskId ? { taskId } : {}),
      ...(teamOnly && projectIds.length > 0 ? { teamOnly: true } : {})
    };
  }, [
    from,
    to,
    billable,
    scenario,
    format,
    organize,
    projectIds,
    userIds,
    categoryId,
    taskId,
    teamOnly,
    timezone
  ]);

  const previewBody = useMemo(() => {
    if (!exportBody) return null;
    return {
      from: exportBody.from,
      to: exportBody.to,
      billable: exportBody.billable,
      reportTypes: exportBody.reportTypes,
      groupBy: exportBody.groupBy,
      sheetLayout: exportBody.sheetLayout,
      ...(exportBody.columns ? { columns: exportBody.columns } : {}),
      ...(exportBody.exportPurpose ? { exportPurpose: exportBody.exportPurpose } : {}),
      ...(exportBody.timezone ? { timezone: exportBody.timezone } : {}),
      ...(exportBody.projectIds?.length ? { projectIds: exportBody.projectIds } : {}),
      ...(exportBody.userIds?.length ? { userIds: exportBody.userIds } : {}),
      ...(exportBody.categoryId ? { categoryId: exportBody.categoryId } : {}),
      ...(exportBody.taskId ? { taskId: exportBody.taskId } : {}),
      ...(exportBody.teamOnly ? { teamOnly: true } : {})
    };
  }, [exportBody]);

  useEffect(() => {
    if (previewBody) onPreviewBodyChange(previewBody);
  }, [previewBody, onPreviewBodyChange]);

  const canAdvanceFromStep = (index: number) => {
    if (index === 0) return scenarioId !== null;
    return scenarioId !== null;
  };

  function goToStep(index: number) {
    if (index > step && !canAdvanceFromStep(step)) return;
    setStep(index);
  }

  const projectNames = projectIds
    .map((id) => projects.find((p) => p.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  const userNames = userIds
    .map((id) => members.find((m) => m.userId === id)?.userName)
    .filter((n): n is string => Boolean(n));
  const categoryName = categoryId ? categories.find((c) => c.id === categoryId)?.name : undefined;
  const taskName = taskId ? tasks.find((t) => t.id === taskId)?.taskName : undefined;
  const scopeMembers = members.map((m) => ({ userId: m.userId, userName: m.userName }));

  const layoutNeedsTimeEntries =
    !!scenario &&
    sheetLayoutRequiresTimeEntries(organize.sheetLayout) &&
    !scenario.reportTypes.includes("time_entries");

  if (!exportBody || !scenario) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">What do you need?</CardTitle>
            <CardDescription>
              Pick a report purpose. We&apos;ll set up the file for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 @min-[960px]/shell:grid-cols-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  selectScenario(s);
                  setStep(1);
                }}
                className="rounded-lg border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
              >
                <p className="text-sm font-medium">
                  {s.title}
                  {POPULAR_SCENARIOS.has(s.id) ? (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      Popular
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.subtitle}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => goToStep(index)}
            disabled={index > step && !canAdvanceFromStep(step)}
            className={`shrink-0 truncate rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              step === index
                ? "bg-primary text-primary-foreground"
                : index < step
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-12 xl:gap-8">
        <div className="min-w-0 space-y-5 xl:col-span-8 xl:space-y-6">
          {step === 0 ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">What do you need?</CardTitle>
                <CardDescription>
                  Pick a report purpose. We&apos;ll set up the file for you.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 @min-[960px]/shell:grid-cols-2">
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectScenario(s)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      scenarioId === s.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {s.title}
                      {POPULAR_SCENARIOS.has(s.id) ? (
                        <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          Popular
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {s.subtitle}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">When?</CardTitle>
                <CardDescription>Choose a quick range or set custom dates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ExportPeriodFilter
                  from={from}
                  to={to}
                  onFromChange={onFromChange}
                  onToChange={onToChange}
                  previewLoading={previewLoading}
                  dateRangeAriaLabel="Quick export date range"
                />
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Who & which projects?</CardTitle>
                <CardDescription>
                  Optional — leave empty to include everyone and all projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExportScopeFilters
                  projectIds={projectIds}
                  userIds={userIds}
                  onProjectIdsChange={onProjectIdsChange}
                  onUserIdsChange={onUserIdsChange}
                  projects={projects}
                  members={scopeMembers}
                  categories={categories}
                  tasks={tasks}
                  categoryId={categoryId}
                  taskId={taskId}
                  onCategoryChange={onCategoryChange}
                  onTaskChange={onTaskChange}
                  teamOnly={teamOnly}
                  onTeamOnlyChange={onTeamOnlyChange}
                  onClearAll={onClearScope}
                  onResetFilters={handleResetFilters}
                  previewLoading={previewLoading}
                />
              </CardContent>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Adjust file details</CardTitle>
                <CardDescription>Optional overrides before you download.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 @min-[960px]/shell:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Billable entries</Label>
                    <Select
                      value={billable}
                      onValueChange={(v) => setBillable(v as ExportBodyDto["billable"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All entries</SelectItem>
                        <SelectItem value="billable">Billable only</SelectItem>
                        <SelectItem value="non_billable">Non-billable only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => setShowOrganize((v) => !v)}
                  >
                    {showOrganize ? "Hide organization options" : "Change how it's organized"}
                  </button>
                </div>

                {showOrganize ? (
                  <ExportOrganizePicker
                    mode="quick"
                    scenarioId={scenario.id}
                    value={organizePreset}
                    onChange={setOrganizePreset}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {describeOrganize(organizePreset)}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvanceFromStep(step)}
              >
                Continue
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 xl:col-span-4">
          <div className="xl:sticky xl:top-6">
            <ExportDownloadPanel
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              periodLabel={formatExportPeriodLabel(from, to)}
              exportBody={exportBody}
              previewBody={previewBody!}
              preview={preview}
              previewLoading={previewLoading}
              previewError={previewError}
              format={format}
              onFormatChange={setFormat}
              purposeSlug={scenario.purposeSlug}
              projectIds={projectIds}
              userIds={userIds}
              projects={projects}
              members={scopeMembers}
              categoryName={categoryName}
              taskName={taskName}
              teamOnly={teamOnly}
              projectNames={projectNames}
              userNames={userNames}
              downloadLabel={scenario.downloadLabel}
              canExport={!layoutNeedsTimeEntries && !!scenarioId}
              layoutWarning={
                layoutNeedsTimeEntries
                  ? "This layout needs a detailed time sheet. Choose a different organization option."
                  : null
              }
              organizeDescription={describeOrganize(organizePreset)}
              showSchedule
              onJobCreated={onJobCreated}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
