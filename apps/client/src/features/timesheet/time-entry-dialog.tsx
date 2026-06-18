"use client";

import type {
  TimeLogDto,
  TaskDto,
  ProjectDto,
  ListTimelogAuditEventsResponseDto,
  JiraIssueDto
} from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import {
  AppModal,
  Button,
  Input,
  Label,
  ProjectColorDot,
  SearchableSelect,
  TimeEntryAuditTrail,
  cn
} from "@kloqra/ui";
import { extractFieldErrorsFromMessage } from "@kloqra/web-shared";
import { Clock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDraftDateLabel, formatDuration } from "./calendar-utils";
import {
  type TimeEntryDraft,
  canSaveTaskDraft,
  draftToIsoRange,
  suggestBillableFromTask,
  taskSaveHint
} from "./time-entry-draft";
import { JiraIssuePicker } from "@/components/jira-issue-picker";
import { api } from "@/lib/api";
import { formatProjectLabel } from "@/lib/project-labels";

export type { TimeEntryDraft } from "./time-entry-draft";
export {
  canSaveTaskDraft,
  draftFromLog,
  draftFromSlot,
  draftFromSlotRange,
  draftToIsoRange,
  suggestBillableFromTask,
  taskSaveHint
} from "./time-entry-draft";

type TimeEntryDialogProps = {
  open: boolean;
  title: string;
  draft: TimeEntryDraft | null;
  projects: ProjectDto[];
  tasks: TaskDto[];
  taskLabel: (taskId: string) => string;
  workspaceNames?: Record<string, string>;
  editingLog?: TimeLogDto | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onDraftChange: (draft: TimeEntryDraft) => void;
  onSave: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
  workspaceId?: string;
  timezone?: string;
  jiraSuggestions?: JiraIssueDto[];
};

export function TimeEntryDialog({
  open,
  title,
  draft,
  projects,
  tasks,
  taskLabel,
  workspaceNames,
  editingLog,
  saving,
  error,
  onClose,
  onDraftChange,
  onSave,
  onDelete,
  readOnly = false,
  workspaceId,
  timezone = "UTC",
  jiraSuggestions = []
}: TimeEntryDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");

  const fetchAuditEvents = useCallback(async () => {
    if (!editingLog || !workspaceId) return [];
    const res = await api<ListTimelogAuditEventsResponseDto>(
      ROUTES.TIMELOGS.AUDIT_EVENTS(editingLog.id),
      { workspaceId }
    );
    return res.items;
  }, [editingLog, workspaceId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setActiveTab("details");
    }
  }, [open, editingLog]);

  const projectTasks = useMemo(
    () => (draft ? tasks.filter((t) => t.projectId === draft.projectId) : []),
    [tasks, draft]
  );

  const projectTasksByCategory = useMemo(() => {
    const groups = new Map<string, TaskDto[]>();
    for (const t of projectTasks) {
      const key = t.categoryName ?? "Other";
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [projectTasks]);

  if (!mounted) return null;

  const canDelete = Boolean(editingLog && onDelete && !readOnly);
  const canEdit = !readOnly && editingLog?.source !== "timer";
  const dateLabel = draft ? formatDraftDateLabel(draft, editingLog) : "";
  const canSave = draft ? canSaveTaskDraft(draft) : false;
  const saveHint = draft ? taskSaveHint(draft) : null;

  const parsedValidation = error
    ? extractFieldErrorsFromMessage<"project" | "task" | "start" | "end" | "description">(error, {
        project: "Project",
        task: "Task",
        start: "Start",
        end: "End",
        description: "Description"
      })
    : { fieldErrors: {}, formError: "" };

  let durationHint = "";
  if (draft) {
    try {
      const { startTime, endTime } = draftToIsoRange(draft, timezone);
      const sec = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;
      if (sec > 0) durationHint = formatDuration(sec);
    } catch {
      /* ignore */
    }
  }

  function patch(partial: Partial<TimeEntryDraft>) {
    if (draft) onDraftChange({ ...draft, ...partial });
  }

  const description = (
    <>
      {dateLabel}
      {editingLog?.source === "timer" ? (
        <span className="mt-1 block text-xs">Started with the stopwatch</span>
      ) : null}
    </>
  );

  const footer =
    activeTab === "details" ? (
      <div className="flex w-full flex-wrap items-center gap-2">
        {canEdit && (
          <Button
            type="submit"
            form="time-entry-form"
            disabled={saving || !canSave}
            title={saveHint ?? undefined}
          >
            {saving ? "Saving…" : editingLog ? "Save changes" : "Log time"}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {canDelete && (
          <Button
            type="button"
            variant="destructive"
            className="sm:ml-auto"
            disabled={saving}
            onClick={() => {
              if (onDelete) onDelete();
            }}
          >
            Delete entry
          </Button>
        )}
      </div>
    ) : (
      <Button type="button" variant="outline" onClick={onClose}>
        Close
      </Button>
    );

  return (
    <AppModal
      open={open && draft !== null}
      onOpenChange={(next) => !next && onClose()}
      title={title}
      description={description}
      icon={<Clock className="size-5" />}
      size="md"
      bodyClassName="space-y-4"
      footer={footer}
    >
      {draft && editingLog && workspaceId ? (
        <div className="flex rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 cursor-pointer",
              activeTab === "details"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 cursor-pointer",
              activeTab === "history"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("history")}
          >
            Change History
          </button>
        </div>
      ) : null}

      {draft && activeTab === "details" ? (
        <form
          id="time-entry-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="space-y-2">
            <Label>Project</Label>
            <SearchableSelect
              value={draft.projectId}
              onValueChange={(projectId) =>
                patch({
                  projectId,
                  taskSelection: "",
                  isBillable: true
                })
              }
              options={projects.map((p) => ({
                value: p.id,
                label: formatProjectLabel(p, workspaceNames)
              }))}
              placeholder="Select project"
              searchPlaceholder="Search projects…"
              disabled={!canEdit}
              contentClassName="z-[100]"
              renderOption={(option) => (
                <span className="flex items-center gap-2">
                  <ProjectColorDot
                    color={projects.find((p) => p.id === option.value)?.color ?? "#236bfe"}
                  />
                  {option.label}
                </span>
              )}
              renderValue={(option) =>
                option ? (
                  <span className="flex items-center gap-2">
                    <ProjectColorDot
                      color={projects.find((p) => p.id === option.value)?.color ?? "#236bfe"}
                    />
                    {option.label}
                  </span>
                ) : (
                  "Select project"
                )
              }
              aria-label="Project"
              triggerClassName={
                parsedValidation.fieldErrors.project ? "border-destructive" : undefined
              }
            />
            {parsedValidation.fieldErrors.project ? (
              <p className="text-xs text-destructive">{parsedValidation.fieldErrors.project}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Task</Label>
            <SearchableSelect
              key={draft.projectId}
              value={draft.taskSelection || ""}
              onValueChange={(taskSelection) =>
                patch({
                  taskSelection,
                  isBillable: suggestBillableFromTask(tasks, taskSelection)
                })
              }
              groups={projectTasksByCategory.map(([categoryName, list]) => ({
                label: categoryName,
                options: list.map((t) => ({ value: t.id, label: t.taskName }))
              }))}
              placeholder={
                !draft.projectId
                  ? "Select a project first"
                  : projectTasks.length === 0
                    ? "No tasks for this project"
                    : "Select a task"
              }
              searchPlaceholder="Search tasks…"
              disabled={!canEdit || !draft.projectId || projectTasks.length === 0}
              contentClassName="z-[100]"
              triggerClassName={
                parsedValidation.fieldErrors.task || (draft.projectId && !draft.taskSelection)
                  ? "border-destructive"
                  : undefined
              }
              aria-label="Task"
            />
            {parsedValidation.fieldErrors.task ? (
              <p className="text-xs text-destructive">{parsedValidation.fieldErrors.task}</p>
            ) : null}
            {draft.projectId && projectTasks.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No tasks yet on this project. Ask your admin to add tasks before logging time.
              </p>
            )}
            {saveHint && (
              <p className="text-xs text-amber-600 dark:text-amber-500" role="status">
                {saveHint}
              </p>
            )}
          </div>

          {draft.taskSelection && (
            <p className="text-xs text-muted-foreground">{taskLabel(draft.taskSelection)}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry-start">Start</Label>
              <Input
                id="entry-start"
                type="time"
                value={draft.startTime}
                disabled={!canEdit}
                onChange={(e) => patch({ startTime: e.target.value })}
                required
                aria-invalid={Boolean(parsedValidation.fieldErrors.start)}
              />
              {parsedValidation.fieldErrors.start ? (
                <p className="text-xs text-destructive">{parsedValidation.fieldErrors.start}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-end">End</Label>
              <Input
                id="entry-end"
                type="time"
                value={draft.endTime}
                disabled={!canEdit}
                onChange={(e) => patch({ endTime: e.target.value })}
                required
                aria-invalid={Boolean(parsedValidation.fieldErrors.end)}
              />
              {parsedValidation.fieldErrors.end ? (
                <p className="text-xs text-destructive">{parsedValidation.fieldErrors.end}</p>
              ) : null}
            </div>
          </div>
          {durationHint && (
            <p className="text-xs text-muted-foreground">Duration: {durationHint}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="entry-description">Description</Label>
            <Input
              id="entry-description"
              value={draft.description}
              disabled={!canEdit}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="What did you work on?"
              aria-invalid={Boolean(parsedValidation.fieldErrors.description)}
            />
            {parsedValidation.fieldErrors.description ? (
              <p className="text-xs text-destructive">{parsedValidation.fieldErrors.description}</p>
            ) : null}
          </div>
          {canEdit && (
            <JiraIssuePicker
              issues={jiraSuggestions}
              onSelect={(value) => patch({ description: value })}
            />
          )}
          {readOnly && editingLog ? (
            <p className="text-sm text-amber-600 dark:text-amber-500" role="status">
              This timesheet period is locked (submitted or approved). Entries cannot be edited or
              deleted.
            </p>
          ) : null}
          {parsedValidation.formError ? (
            <p className="text-sm text-destructive">{parsedValidation.formError}</p>
          ) : error && Object.keys(parsedValidation.fieldErrors).length === 0 ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </form>
      ) : draft && activeTab === "history" ? (
        <div className="max-h-72 overflow-y-auto pr-1">
          <TimeEntryAuditTrail fetchEvents={fetchAuditEvents} tasks={tasks} projects={projects} />
        </div>
      ) : null}
    </AppModal>
  );
}
