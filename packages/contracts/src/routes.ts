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
    STOP_IMPERSONATION: "/auth/stop-impersonation"
  },
  WORKSPACES: {
    LIST: "/workspaces",
    CREATE: "/workspaces",
    BY_ID: (id: string) => `/workspaces/${id}`,
    MEMBERS: (id: string) => `/workspaces/${id}/members`,
    INVITE: (id: string) => `/workspaces/${id}/members/invite`
  },
  PROJECTS: {
    LIST: "/projects",
    CREATE: "/projects",
    BY_ID: (id: string) => `/projects/${id}`,
    TEAM: (id: string) => `/projects/${id}/team`,
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
  TIMELOGS: {
    LIST: "/timelogs",
    CREATE: "/timelogs",
    BY_ID: (id: string) => `/timelogs/${id}`,
    AUDIT_EVENTS: (id: string) => `/timelogs/${id}/audit-events`,
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
    TASKS: "/reporting/tasks"
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
    INVOICE: "/export/invoice"
  },
  TIMESHEETS: {
    MY_STATUS: "/timesheets/status",
    MY_SUBMISSIONS: "/timesheets/submissions",
    SUBMIT: "/timesheets/submit",
    LIST_PENDING: "/timesheets/pending",
    APPROVE: (id: string) => `/timesheets/${id}/approve`,
    REJECT: (id: string) => `/timesheets/${id}/reject`
  }
} as const;
