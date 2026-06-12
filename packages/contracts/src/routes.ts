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
    MEMBER: (workspaceId: string, memberId: string) =>
      `/workspaces/${workspaceId}/members/${memberId}`,
    INVITE: (id: string) => `/workspaces/${id}/members/invite`
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
    BY_ID: (id: string) => `/categories/${id}`
  },
  TIMELOGS: {
    LIST: "/timelogs",
    OCCUPANCY: "/timelogs/occupancy",
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
    CATEGORIES_HEATMAP: "/reporting/categories-heatmap",
    TASKS: "/reporting/tasks",
    PROJECT_SUMMARY: (projectId: string) => `/reporting/projects/${projectId}/summary`
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
  },
  NOTIFICATIONS: {
    LIST: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
    BY_ID: (id: string) => `/notifications/${id}`,
    MARK_ALL_READ: "/notifications/mark-all-read"
  }
} as const;
