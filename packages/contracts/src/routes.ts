export const ROUTES = {
  HEALTH: "/health",
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    SWITCH_WORKSPACE: "/auth/switch-workspace",
    IMPERSONATE: "/auth/impersonate",
    IMPERSONATE_COMPLETE: "/auth/impersonate/complete",
    STOP_IMPERSONATION: "/auth/stop-impersonation",
    SET_PASSWORD: "/auth/set-password",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    VERIFY_EMAIL: "/auth/verify-email",
    RESEND_VERIFICATION: "/auth/resend-verification"
  },
  USERS: {
    ME: "/users/me",
    PREFERENCES: "/users/me/preferences",
    DASHBOARD_LAYOUT: "/users/me/dashboard-layout",
    PASSWORD: "/users/me/password",
    SESSIONS: "/users/me/sessions",
    REVOKE_OTHER_SESSIONS: "/users/me/sessions/revoke-others",
    SESSION: (id: string) => `/users/me/sessions/${id}`,
    TWO_FA_ENABLE: "/users/me/2fa/enable",
    TWO_FA_VERIFY: "/users/me/2fa/verify",
    TWO_FA_DISABLE: "/users/me/2fa/disable",
    ACTIVITY: "/users/me/activity",
    PROJECT_COLOR: (projectId: string) => `/users/me/projects/${projectId}/color`
  },
  WORKSPACES: {
    LIST: "/workspaces",
    CREATE: "/workspaces",
    BY_ID: (id: string) => `/workspaces/${id}`,
    MEMBERS: (id: string) => `/workspaces/${id}/members`,
    MEMBERS_OVERVIEW: (id: string) => `/workspaces/${id}/members/overview`,
    TEAM_ACTIVITIES: (id: string) => `/workspaces/${id}/team-activities`,
    MEMBER: (workspaceId: string, memberId: string) =>
      `/workspaces/${workspaceId}/members/${memberId}`,
    INVITE: (id: string) => `/workspaces/${id}/members/invite`,
    BULK_MEMBERS: (id: string) => `/workspaces/${id}/members/bulk`,
    BULK_MEMBERS_TEMPLATE: (id: string) => `/workspaces/${id}/members/bulk/template`,
    BULK_MEMBERS_UPLOAD: (id: string) => `/workspaces/${id}/members/bulk/upload`,
    RESEND_CREDENTIALS: (workspaceId: string, memberId: string) =>
      `/workspaces/${workspaceId}/members/${memberId}/resend-credentials`
  },
  PROJECTS: {
    LIST: "/projects",
    CREATE: "/projects",
    BY_ID: (id: string) => `/projects/${id}`,
    TEAM: (id: string) => `/projects/${id}/team`,
    TEAM_MEMBERS: (id: string) => `/projects/${id}/team/members`,
    TEAM_MEMBER: (projectId: string, memberId: string) =>
      `/projects/${projectId}/team/members/${memberId}`,
    TEAM_INVITES: (id: string) => `/projects/${id}/team/invites`,
    /** @deprecated Use TEAM */
    MEMBERS: (id: string) => `/projects/${id}/team`,
    /** @deprecated Use TEAM_INVITES */
    INVITES: (id: string) => `/projects/${id}/team/invites`
  },
  TEAM_INVITES: {
    PREVIEW: (token: string) => `/team-invites/${token}`,
    ACCEPT: (token: string) => `/team-invites/${token}/accept`
  },
  /** @deprecated Use TEAM_INVITES */
  PROJECT_INVITES: {
    PREVIEW: (token: string) => `/team-invites/${token}`,
    ACCEPT: (token: string) => `/team-invites/${token}/accept`
  },
  TASKS: {
    LIST: "/tasks",
    CREATE: "/tasks",
    BY_ID: (id: string) => `/tasks/${id}`
  },
  CATEGORIES: {
    LIST: "/categories",
    CREATE: "/categories",
    BY_ID: (id: string) => `/categories/${id}`,
    BULK: "/categories/bulk",
    BULK_TEMPLATE: "/categories/bulk/template",
    BULK_UPLOAD: "/categories/bulk/upload"
  },
  TIMELOGS: {
    LIST: "/timelogs",
    OCCUPANCY: "/timelogs/occupancy",
    CREATE: "/timelogs",
    CREATE_BATCH: "/timelogs/batch",
    BY_ID: (id: string) => `/timelogs/${id}`,
    AUDIT_EVENTS: (id: string) => `/timelogs/${id}/audit-events`,
    AUDIT_EVENTS_WORKSPACE: "/timelogs/audit",
    YESTERDAY_SUMMARY: "/timelogs/yesterday-summary"
  },
  TIMER: {
    START: "/timer/start",
    STOP: "/timer/stop",
    ACTIVE: "/timer/active",
    ACTIVE_COUNT: "/timer/active-count",
    PAUSE: "/timer/pause",
    RESUME: "/timer/resume",
    DISCARD: "/timer/discard"
  },
  BILLING: {
    RATES: "/billing/rates",
    SUMMARY: "/billing/summary"
  },
  REPORTING: {
    DASHBOARD: "/reporting/dashboard",
    ME: "/reporting/me",
    BUDGET: (id: string) => `/reporting/projects/${id}/budget`,
    UTILIZATION: "/reporting/utilization",
    HEATMAP: "/reporting/heatmap",
    CATEGORIES_HEATMAP: "/reporting/categories-heatmap",
    TASKS: "/reporting/tasks",
    PROJECT_SUMMARY: (projectId: string) => `/reporting/projects/${projectId}/summary`,
    WIDGET_SHARE: (token: string) => `/reporting/widget-share/${token}`,
    WIDGET_SHARES: "/reporting/widget-shares"
  },
  PUBLIC_REPORTING: {
    DASHBOARD: "/public/reporting/dashboard",
    UTILIZATION: "/public/reporting/utilization",
    BUDGET: (id: string) => `/public/reporting/projects/${id}/budget`,
    HEATMAP: "/public/reporting/heatmap",
    CATEGORIES_HEATMAP: "/public/reporting/categories-heatmap",
    TASKS: "/public/reporting/tasks"
  },
  REPORTING_API_KEYS: {
    LIST: "/reporting-api-keys",
    CREATE: "/reporting-api-keys",
    BY_ID: (id: string) => `/reporting-api-keys/${id}`
  },
  PRESENCE: {
    STREAM: "/presence/stream",
    SNAPSHOT: "/presence/snapshot"
  },
  EXPORT: {
    GENERATE: "/export",
    PREVIEW: "/export/preview",
    ME: "/export/me",
    PRESETS: "/export/presets",
    PRESET: (id: string) => `/export/presets/${id}`,
    SCHEDULES: "/export/schedules",
    SCHEDULE: (id: string) => `/export/schedules/${id}`,
    SHARE: (token: string) => `/export/share/${token}`,
    SHARES: "/export/shares",
    INVOICE: "/export/invoice",
    JOBS: "/export/jobs",
    JOB: (id: string) => `/export/jobs/${id}`,
    JOB_DOWNLOAD: (id: string) => `/export/jobs/${id}/download`
  },
  TIMESHEETS: {
    MY_STATUS: "/timesheets/status",
    MY_SUBMISSIONS: "/timesheets/submissions",
    SUBMIT_PREVIEW: "/timesheets/submit-preview",
    SUBMIT: "/timesheets/submit",
    LIST_PENDING: "/timesheets/pending",
    LIST_APPROVED: "/timesheets/approved",
    LIST_REJECTED: "/timesheets/rejected",
    LIST_MISSING: "/timesheets/missing",
    REMIND: "/timesheets/remind",
    LIST_AMENDMENTS: "/timesheets/amendments/pending",
    CREATE_AMENDMENT: (periodId: string) => `/timesheets/${periodId}/amendments`,
    APPROVE_AMENDMENT: (id: string) => `/timesheets/amendments/${id}/approve`,
    DENY_AMENDMENT: (id: string) => `/timesheets/amendments/${id}/deny`,
    APPROVE: (id: string) => `/timesheets/${id}/approve`,
    REJECT: (id: string) => `/timesheets/${id}/reject`
  },
  NOTIFICATIONS: {
    LIST: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
    BY_ID: (id: string) => `/notifications/${id}`,
    MARK_ALL_READ: "/notifications/mark-all-read"
  },
  ASSISTANT: {
    CHAT: "/assistant/chat"
  },
  JIRA: {
    MY_ISSUES: "/jira/my-issues",
    CREDENTIALS: "/jira/credentials",
    VERIFY: "/jira/verify",
    VERIFY_USER: "/jira/verify-user"
  }
} as const;
