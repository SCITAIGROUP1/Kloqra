import { z } from "zod";
import { BRAND_NAME } from "./brand";
import { uuidSchema } from "./dto/common.dto";
import {
  type notificationMetadataSchema,
  notificationTypeSchema,
  type NotificationType
} from "./dto/notification.dto";
import type { NotificationPreferenceKey } from "./user-preferences";

export const notificationVariantSchema = z.enum(["success", "attention", "warning", "info"]);
export type NotificationVariant = z.infer<typeof notificationVariantSchema>;

export const notificationTemplateIdSchema = z.enum([
  "project.assigned",
  "task.assigned",
  "timesheet.submitted",
  "timesheet.approved",
  "timesheet.rejected",
  "timesheet.reminder",
  "timer.autostopped",
  "member.joined",
  "member.removed",
  "workspace.added",
  "export.ready",
  "export.failed",
  "budget.near",
  "budget.over",
  "jira.synced"
]);

export type NotificationTemplateId = z.infer<typeof notificationTemplateIdSchema>;

const optionalName = z.string().min(1).max(120).optional();

export const projectAssignedContextSchema = z.object({
  projectName: z.string().min(1).max(120),
  projectId: uuidSchema,
  addedByName: optionalName
});

export const taskAssignedContextSchema = z.object({
  taskName: z.string().min(1).max(120),
  projectName: z.string().min(1).max(120),
  taskId: uuidSchema,
  projectId: uuidSchema
});

export const timesheetSubmittedContextSchema = z.object({
  submitterName: z.string().min(1).max(120),
  projectName: z.string().min(1).max(120),
  periodLabel: z.string().min(1).max(120),
  periodId: uuidSchema,
  projectId: uuidSchema,
  totalHours: z.number().positive().optional()
});

export const timesheetReviewedContextSchema = z.object({
  projectName: z.string().min(1).max(120),
  periodLabel: z.string().min(1).max(120),
  periodId: uuidSchema,
  projectId: uuidSchema,
  reviewerName: optionalName,
  reviewNote: z.string().max(500).optional()
});

export const timesheetReminderContextSchema = z.object({
  periodLabel: z.string().min(1).max(120),
  dueLabel: z.string().max(120).optional(),
  periodStart: z.string().datetime()
});

export const timerAutostoppedContextSchema = z.object({
  hours: z.number().positive(),
  taskName: z.string().max(120).optional(),
  taskId: uuidSchema.optional()
});

export const memberJoinedContextSchema = z.object({
  memberName: z.string().min(1).max(120),
  workspaceName: z.string().min(1).max(120),
  inviterName: optionalName
});

export const memberRemovedContextSchema = z.object({
  memberName: z.string().min(1).max(120),
  workspaceName: z.string().min(1).max(120),
  actorName: optionalName
});

export const workspaceAddedContextSchema = z.object({
  workspaceName: z.string().min(1).max(120),
  inviterName: optionalName
});

export const exportScheduleContextSchema = z.object({
  scheduleName: z.string().min(1).max(120),
  errorMessage: z.string().max(500).optional()
});

export const budgetAlertContextSchema = z.object({
  projectName: z.string().min(1).max(120),
  projectId: uuidSchema,
  percentUsed: z.number().nonnegative(),
  budgetHours: z.number().positive()
});

export const jiraSyncedContextSchema = z.object({
  projectName: z.string().max(120).optional(),
  syncSummary: z.string().max(300).optional()
});

const TEMPLATE_CONTEXT_SCHEMAS = {
  "project.assigned": projectAssignedContextSchema,
  "task.assigned": taskAssignedContextSchema,
  "timesheet.submitted": timesheetSubmittedContextSchema,
  "timesheet.approved": timesheetReviewedContextSchema,
  "timesheet.rejected": timesheetReviewedContextSchema,
  "timesheet.reminder": timesheetReminderContextSchema,
  "timer.autostopped": timerAutostoppedContextSchema,
  "member.joined": memberJoinedContextSchema,
  "member.removed": memberRemovedContextSchema,
  "workspace.added": workspaceAddedContextSchema,
  "export.ready": exportScheduleContextSchema,
  "export.failed": exportScheduleContextSchema,
  "budget.near": budgetAlertContextSchema,
  "budget.over": budgetAlertContextSchema,
  "jira.synced": jiraSyncedContextSchema
} as const satisfies Record<NotificationTemplateId, z.ZodTypeAny>;

export type NotificationTemplateContextMap = {
  [K in NotificationTemplateId]: z.infer<(typeof TEMPLATE_CONTEXT_SCHEMAS)[K]>;
};

export type RenderedNotification = {
  type: NotificationType;
  preferenceKey: NotificationPreferenceKey;
  title: string;
  body: string;
  emailSubject: string;
  preheader: string;
  metadata: z.infer<typeof notificationMetadataSchema>;
};

const TEMPLATE_META: Record<
  NotificationTemplateId,
  { type: NotificationType; preferenceKey: NotificationPreferenceKey }
> = {
  "project.assigned": { type: "PROJECT_ASSIGNMENT", preferenceKey: "projectAssignment" },
  "task.assigned": { type: "TASK_ASSIGNMENT", preferenceKey: "taskAssignment" },
  "timesheet.submitted": { type: "APPROVAL_REQUEST", preferenceKey: "approvalRequest" },
  "timesheet.approved": { type: "TIMESHEET_STATUS", preferenceKey: "timesheetStatus" },
  "timesheet.rejected": { type: "TIMESHEET_STATUS", preferenceKey: "timesheetStatus" },
  "timesheet.reminder": { type: "TIMESHEET_REMINDER", preferenceKey: "timesheetReminders" },
  "timer.autostopped": { type: "IDLE_TIMER_ALERT", preferenceKey: "idleTimerAlert" },
  "member.joined": { type: "MEMBER_CHANGE", preferenceKey: "memberChanges" },
  "member.removed": { type: "MEMBER_CHANGE", preferenceKey: "memberChanges" },
  "workspace.added": { type: "WORKSPACE_ADDED", preferenceKey: "workspaceAdded" },
  "export.ready": { type: "EXPORT_SCHEDULE", preferenceKey: "exportSchedule" },
  "export.failed": { type: "EXPORT_SCHEDULE", preferenceKey: "exportSchedule" },
  "budget.near": { type: "BUDGET_ALERT", preferenceKey: "budgetAlert" },
  "budget.over": { type: "BUDGET_ALERT", preferenceKey: "budgetAlert" },
  "jira.synced": { type: "JIRA_SYNC_UPDATE", preferenceKey: "jiraSyncUpdates" }
};

/** ISO week number (1–53) for period labeling. */
export function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function formatTimesheetPeriodLabel(
  periodStart: Date,
  approvalPeriod: "daily" | "weekly" | "monthly"
): string {
  if (approvalPeriod === "daily") {
    return periodStart.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric"
    });
  }
  if (approvalPeriod === "monthly") {
    return periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return `Week ${getIsoWeekNumber(periodStart)}`;
}

function subjectPrefix(text: string): string {
  return `[${BRAND_NAME}] ${text}`;
}

function renderTemplate(
  templateId: NotificationTemplateId,
  context: NotificationTemplateContextMap[NotificationTemplateId]
): RenderedNotification {
  const { type, preferenceKey } = TEMPLATE_META[templateId];

  switch (templateId) {
    case "project.assigned": {
      const c = context as NotificationTemplateContextMap["project.assigned"];
      const addedBy = c.addedByName ? `${c.addedByName} added you to ` : "You were added to ";
      return {
        type,
        preferenceKey,
        title: "New project",
        body: `${addedBy}${c.projectName}.`,
        emailSubject: subjectPrefix(`Added to ${c.projectName}`),
        preheader: `You can now track time on ${c.projectName}.`,
        metadata: {
          href: `/projects/${c.projectId}/overview`,
          projectId: c.projectId,
          variant: "info",
          ctaLabel: "View project",
          details: [{ label: "Project", value: c.projectName }]
        }
      };
    }
    case "task.assigned": {
      const c = context as NotificationTemplateContextMap["task.assigned"];
      return {
        type,
        preferenceKey,
        title: "Task assigned",
        body: `You were assigned to "${c.taskName}" on ${c.projectName}.`,
        emailSubject: subjectPrefix(`Task assigned: ${c.taskName}`),
        preheader: `New task on ${c.projectName}.`,
        metadata: {
          href: "/tasks",
          projectId: c.projectId,
          taskId: c.taskId,
          variant: "info",
          ctaLabel: "View tasks",
          details: [
            { label: "Task", value: c.taskName },
            { label: "Project", value: c.projectName }
          ]
        }
      };
    }
    case "timesheet.submitted": {
      const c = context as NotificationTemplateContextMap["timesheet.submitted"];
      const hoursLine =
        typeof c.totalHours === "number" ? `${c.totalHours.toFixed(1)} hours logged` : undefined;
      return {
        type,
        preferenceKey,
        title: "Timesheet to review",
        body: `${c.submitterName} submitted ${c.periodLabel} for ${c.projectName}.`,
        emailSubject: subjectPrefix(`Review timesheet — ${c.projectName}`),
        preheader: `${c.submitterName} is waiting for your approval.`,
        metadata: {
          href: "/approvals",
          periodId: c.periodId,
          projectId: c.projectId,
          variant: "attention",
          ctaLabel: "Review timesheet",
          details: [
            { label: "Member", value: c.submitterName },
            { label: "Project", value: c.projectName },
            { label: "Period", value: c.periodLabel },
            ...(hoursLine ? [{ label: "Hours", value: hoursLine }] : [])
          ]
        }
      };
    }
    case "timesheet.approved": {
      const c = context as NotificationTemplateContextMap["timesheet.approved"];
      return {
        type,
        preferenceKey,
        title: "Timesheet approved",
        body: `Your timesheet for ${c.periodLabel} on ${c.projectName} was approved.`,
        emailSubject: subjectPrefix(`Timesheet approved — ${c.projectName}`),
        preheader: `Your ${c.periodLabel} timesheet is approved.`,
        metadata: {
          href: "/timesheet",
          periodId: c.periodId,
          projectId: c.projectId,
          variant: "success",
          ctaLabel: "View timesheet",
          details: [
            { label: "Project", value: c.projectName },
            { label: "Period", value: c.periodLabel },
            ...(c.reviewerName ? [{ label: "Reviewed by", value: c.reviewerName }] : [])
          ]
        }
      };
    }
    case "timesheet.rejected": {
      const c = context as NotificationTemplateContextMap["timesheet.rejected"];
      return {
        type,
        preferenceKey,
        title: "Timesheet rejected",
        body: `Your timesheet for ${c.periodLabel} on ${c.projectName} was rejected.${
          c.reviewNote ? ` Note: ${c.reviewNote}` : ""
        }`,
        emailSubject: subjectPrefix(`Timesheet rejected — ${c.projectName}`),
        preheader: `Action needed on your ${c.periodLabel} timesheet.`,
        metadata: {
          href: "/timesheet",
          periodId: c.periodId,
          projectId: c.projectId,
          variant: "warning",
          ctaLabel: "Update timesheet",
          details: [
            { label: "Project", value: c.projectName },
            { label: "Period", value: c.periodLabel },
            ...(c.reviewerName ? [{ label: "Reviewed by", value: c.reviewerName }] : []),
            ...(c.reviewNote ? [{ label: "Note", value: c.reviewNote }] : [])
          ]
        }
      };
    }
    case "timesheet.reminder": {
      const c = context as NotificationTemplateContextMap["timesheet.reminder"];
      return {
        type,
        preferenceKey,
        title: "Submit your timesheet",
        body: c.dueLabel
          ? `Please submit your timesheet for ${c.periodLabel} by ${c.dueLabel}.`
          : `Please submit your timesheet for ${c.periodLabel}.`,
        emailSubject: subjectPrefix(`Timesheet reminder — ${c.periodLabel}`),
        preheader: "Your timesheet is due for submission.",
        metadata: {
          href: "/timesheet",
          variant: "attention",
          ctaLabel: "Open timesheet",
          periodStart: c.periodStart,
          details: [{ label: "Period", value: c.periodLabel }]
        }
      };
    }
    case "timer.autostopped": {
      const c = context as NotificationTemplateContextMap["timer.autostopped"];
      const taskPart = c.taskName ? ` on "${c.taskName}"` : "";
      return {
        type,
        preferenceKey,
        title: "Timer auto-stopped",
        body: `Your timer${taskPart} was automatically stopped after ${c.hours} hours.`,
        emailSubject: subjectPrefix("Timer auto-stopped"),
        preheader: "Your running timer reached the auto-stop limit.",
        metadata: {
          href: "/timer",
          ...(c.taskId ? { taskId: c.taskId } : {}),
          variant: "warning",
          ctaLabel: "Open timer",
          details: [
            { label: "Limit", value: `${c.hours} hours` },
            ...(c.taskName ? [{ label: "Task", value: c.taskName }] : [])
          ]
        }
      };
    }
    case "member.joined": {
      const c = context as NotificationTemplateContextMap["member.joined"];
      return {
        type,
        preferenceKey,
        title: "Member joined",
        body: `${c.memberName} joined ${c.workspaceName}.${
          c.inviterName ? ` Invited by ${c.inviterName}.` : ""
        }`,
        emailSubject: subjectPrefix(`New team member — ${c.memberName}`),
        preheader: `${c.memberName} is now in your workspace.`,
        metadata: {
          href: "/team-management",
          variant: "success",
          ctaLabel: "View team",
          details: [
            { label: "Member", value: c.memberName },
            { label: "Workspace", value: c.workspaceName }
          ]
        }
      };
    }
    case "member.removed": {
      const c = context as NotificationTemplateContextMap["member.removed"];
      return {
        type,
        preferenceKey,
        title: "Member removed",
        body: `${c.memberName} was removed from ${c.workspaceName}.${
          c.actorName ? ` Removed by ${c.actorName}.` : ""
        }`,
        emailSubject: subjectPrefix(`Team member removed`),
        preheader: `${c.memberName} no longer has workspace access.`,
        metadata: {
          href: "/team-management",
          variant: "warning",
          ctaLabel: "View team",
          details: [
            { label: "Member", value: c.memberName },
            { label: "Workspace", value: c.workspaceName }
          ]
        }
      };
    }
    case "workspace.added": {
      const c = context as NotificationTemplateContextMap["workspace.added"];
      return {
        type,
        preferenceKey,
        title: "Added to workspace",
        body: c.inviterName
          ? `${c.inviterName} added you to ${c.workspaceName}.`
          : `You have been added to ${c.workspaceName}.`,
        emailSubject: subjectPrefix(`Added to ${c.workspaceName}`),
        preheader: `Welcome to ${c.workspaceName} on ${BRAND_NAME}.`,
        metadata: {
          href: "/projects",
          variant: "success",
          ctaLabel: "Open workspace",
          details: [{ label: "Workspace", value: c.workspaceName }]
        }
      };
    }
    case "export.ready": {
      const c = context as NotificationTemplateContextMap["export.ready"];
      return {
        type,
        preferenceKey,
        title: "Export ready",
        body: `Scheduled export "${c.scheduleName}" completed successfully.`,
        emailSubject: subjectPrefix(`Export ready — ${c.scheduleName}`),
        preheader: "Your scheduled export finished successfully.",
        metadata: {
          href: "/exports",
          variant: "success",
          ctaLabel: "View exports",
          details: [{ label: "Schedule", value: c.scheduleName }]
        }
      };
    }
    case "export.failed": {
      const c = context as NotificationTemplateContextMap["export.failed"];
      return {
        type,
        preferenceKey,
        title: "Export failed",
        body: `Scheduled export "${c.scheduleName}" could not run.${
          c.errorMessage ? ` ${c.errorMessage}` : ""
        }`,
        emailSubject: subjectPrefix(`Export failed — ${c.scheduleName}`),
        preheader: "A scheduled export needs attention.",
        metadata: {
          href: "/exports",
          variant: "warning",
          ctaLabel: "View exports",
          details: [
            { label: "Schedule", value: c.scheduleName },
            ...(c.errorMessage ? [{ label: "Error", value: c.errorMessage }] : [])
          ]
        }
      };
    }
    case "budget.near": {
      const c = context as NotificationTemplateContextMap["budget.near"];
      return {
        type,
        preferenceKey,
        title: "Budget threshold reached",
        body: `${c.projectName} has used ${c.percentUsed.toFixed(0)}% of its ${c.budgetHours}h budget.`,
        emailSubject: subjectPrefix(`Budget alert — ${c.projectName}`),
        preheader: `${c.projectName} is nearing its hour budget.`,
        metadata: {
          href: `/projects/${c.projectId}/overview`,
          projectId: c.projectId,
          variant: "attention",
          ctaLabel: "View project",
          details: [
            { label: "Project", value: c.projectName },
            { label: "Used", value: `${c.percentUsed.toFixed(0)}%` },
            { label: "Budget", value: `${c.budgetHours}h` }
          ]
        }
      };
    }
    case "budget.over": {
      const c = context as NotificationTemplateContextMap["budget.over"];
      return {
        type,
        preferenceKey,
        title: "Budget exceeded",
        body: `${c.projectName} has exceeded its ${c.budgetHours}h budget (${c.percentUsed.toFixed(0)}% used).`,
        emailSubject: subjectPrefix(`Over budget — ${c.projectName}`),
        preheader: `${c.projectName} is over its hour budget.`,
        metadata: {
          href: `/projects/${c.projectId}/overview`,
          projectId: c.projectId,
          variant: "warning",
          ctaLabel: "View project",
          details: [
            { label: "Project", value: c.projectName },
            { label: "Used", value: `${c.percentUsed.toFixed(0)}%` },
            { label: "Budget", value: `${c.budgetHours}h` }
          ]
        }
      };
    }
    case "jira.synced": {
      const c = context as NotificationTemplateContextMap["jira.synced"];
      return {
        type,
        preferenceKey,
        title: "Jira sync complete",
        body:
          c.syncSummary ?? `Jira sync completed${c.projectName ? ` for ${c.projectName}` : ""}.`,
        emailSubject: subjectPrefix("Jira sync complete"),
        preheader: "Your Jira sync finished successfully.",
        metadata: {
          href: "/settings?section=notifications",
          variant: "success",
          ctaLabel: "Open settings",
          ...(c.projectName ? { details: [{ label: "Project", value: c.projectName }] } : {})
        }
      };
    }
    default: {
      const _exhaustive: never = templateId;
      throw new Error(`Unknown template: ${String(_exhaustive)}`);
    }
  }
}

export function buildNotificationTemplate<T extends NotificationTemplateId>(
  templateId: T,
  context: NotificationTemplateContextMap[T]
): RenderedNotification {
  const schema = TEMPLATE_CONTEXT_SCHEMAS[templateId];
  const parsed = schema.safeParse(context);
  if (!parsed.success) {
    throw new Error(`Invalid context for ${templateId}: ${parsed.error.message}`);
  }
  return renderTemplate(
    templateId,
    parsed.data as NotificationTemplateContextMap[NotificationTemplateId]
  );
}

/** Validates template id strings at runtime (e.g. from config). */
export function parseNotificationTemplateId(value: unknown): NotificationTemplateId {
  return notificationTemplateIdSchema.parse(value);
}

export function parseNotificationType(value: unknown): NotificationType {
  return notificationTypeSchema.parse(value);
}
