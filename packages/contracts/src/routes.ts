export const ROUTES = {
  HEALTH: "/health",
  AUTH: {
    REGISTER: "/auth/register",
    SIGNUP: "/auth/signup",
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
    RESEND_VERIFICATION: "/auth/resend-verification",
    PLATFORM_COMPLETE_2FA_SETUP: "/auth/platform/complete-2fa-setup",
    PLATFORM_2FA_SETUP_ENABLE: "/auth/platform/2fa-setup/enable"
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
    PROJECT_MANAGERS_OVERVIEW: (id: string) => `/workspaces/${id}/project-managers/overview`,
    TEAM_ACTIVITIES: (id: string) => `/workspaces/${id}/team-activities`,
    MEMBER: (workspaceId: string, memberId: string) =>
      `/workspaces/${workspaceId}/members/${memberId}`,
    INVITE: (id: string) => `/workspaces/${id}/members/invite`,
    BULK_MEMBERS: (id: string) => `/workspaces/${id}/members/bulk`,
    BULK_MEMBERS_TEMPLATE: (id: string) => `/workspaces/${id}/members/bulk/template`,
    BULK_MEMBERS_UPLOAD: (id: string) => `/workspaces/${id}/members/bulk/upload`,
    RESEND_CREDENTIALS: (workspaceId: string, memberId: string) =>
      `/workspaces/${workspaceId}/members/${memberId}/resend-credentials`,
    ASSIGN_ADMIN: (workspaceId: string) => `/workspaces/${workspaceId}/admins/assign`
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
    MARK_ALL_READ: "/notifications/mark-all-read",
    /** Socket.IO namespace — append to API base URL. */
    SOCKET_NAMESPACE: "/notifications"
  },
  ASSISTANT: {
    CHAT: "/assistant/chat"
  },
  JIRA: {
    MY_ISSUES: "/jira/my-issues",
    CREDENTIALS: "/jira/credentials",
    VERIFY: "/jira/verify",
    VERIFY_USER: "/jira/verify-user"
  },
  /** Organization (tenant) account — SaaS-F06+. */
  TENANTS: {
    PUBLIC: (slug: string) => `/tenants/public/${slug}`,
    CURRENT: "/tenants/current",
    OVERVIEW: "/tenants/current/overview",
    MEMBERS: "/tenants/current/members",
    MEMBER: (id: string) => `/tenants/current/members/${id}`,
    WORKSPACE_ADMINS_OVERVIEW: "/tenants/current/workspace-admins/overview",
    WORKSPACE_MEMBER: (workspaceId: string, memberId: string) =>
      `/tenants/current/workspaces/${workspaceId}/members/${memberId}`,
    WORKSPACE_MEMBER_RESEND: (workspaceId: string, memberId: string) =>
      `/tenants/current/workspaces/${workspaceId}/members/${memberId}/resend-credentials`,
    WORKSPACES: "/tenants/current/workspaces",
    WORKSPACES_TREE: "/tenants/current/workspaces-tree",
    SUBSCRIPTION: "/tenants/current/subscription",
    SALES_INQUIRY: "/tenants/current/subscription/sales-inquiry",
    SALES_INQUIRY_RECEIPTS: "/tenants/current/subscription/sales-inquiry/receipts",
    CHECKOUT: "/tenants/current/subscription/checkout",
    PORTAL: "/tenants/current/subscription/portal",
    ANALYTICS_SUMMARY: "/tenants/current/analytics/summary",
    DATA_EXPORT: "/tenants/current/data-export",
    DATA_EXPORT_JOB: (id: string) => `/tenants/current/data-export/${id}`,
    DATA_EXPORT_JOB_DOWNLOAD: (id: string) => `/tenants/current/data-export/${id}/download`
  },
  WEBHOOKS: {
    STRIPE: "/webhooks/stripe"
  },
  /** Public plan catalog for self-serve signup (SaaS-F20). */
  PLANS: {
    PUBLIC: "/plans/public",
    PRICING: "/plans/pricing"
  },
  /** Kloqra staff — platform-admin app; mutations F15+. */
  PLATFORM: {
    TENANTS: "/platform/tenants",
    TENANT: (id: string) => `/platform/tenants/${id}`,
    SUBSCRIPTIONS: "/platform/subscriptions",
    SUBSCRIPTION_WORK_QUEUE: "/platform/subscriptions/work-queue",
    SUBSCRIPTION_DETAIL: (tenantId: string) => `/platform/subscriptions/${tenantId}`,
    SUBSCRIPTION_EVENTS: (tenantId: string) => `/platform/subscriptions/${tenantId}/events`,
    TENANT_SALES_INQUIRIES: (id: string) => `/platform/tenants/${id}/sales-inquiries`,
    TENANT_SALES_INQUIRY_SEND_INSTRUCTIONS: (tenantId: string, inquiryId: string) =>
      `/platform/tenants/${tenantId}/sales-inquiries/${inquiryId}/send-instructions`,
    TENANT_SALES_INQUIRY_RECEIPT: (tenantId: string, inquiryId: string, receiptId: string) =>
      `/platform/tenants/${tenantId}/sales-inquiries/${inquiryId}/receipts/${receiptId}`,
    TENANT_DELETE: (id: string) => `/platform/tenants/${id}`,
    SUSPEND_TENANT: (id: string) => `/platform/tenants/${id}/suspend`,
    PLANS: "/platform/plans",
    PLAN: (id: string) => `/platform/plans/${id}`,
    CATALOG_SETTINGS: "/platform/catalog-settings",
    OPS_SUMMARY: "/platform/ops/summary",
    AUDIT_EVENTS: "/platform/audit-events",
    ME: "/platform/me",
    ME_PREFERENCES: "/platform/me/preferences",
    ME_DASHBOARD_LAYOUT: "/platform/me/dashboard-layout",
    ME_PASSWORD: "/platform/me/password",
    ME_SESSIONS: "/platform/me/sessions",
    ME_SESSIONS_REVOKE_OTHERS: "/platform/me/sessions/revoke-others",
    ME_SESSION: (id: string) => `/platform/me/sessions/${id}`,
    ME_2FA_ENABLE: "/platform/me/2fa/enable",
    ME_2FA_VERIFY: "/platform/me/2fa/verify",
    ME_2FA_DISABLE: "/platform/me/2fa/disable",
    NOTIFICATIONS: "/platform/notifications",
    NOTIFICATIONS_UNREAD_COUNT: "/platform/notifications/unread-count",
    NOTIFICATION: (id: string) => `/platform/notifications/${id}`,
    NOTIFICATIONS_MARK_ALL_READ: "/platform/notifications/mark-all-read",
    QUEUES: "/platform/queues",
    QUEUE_PAUSE: (name: string) => `/platform/queues/${name}/pause`,
    QUEUE_RESUME: (name: string) => `/platform/queues/${name}/resume`,
    QUEUE_RETRY_FAILED: (name: string) => `/platform/queues/${name}/retry-failed`,
    QUEUE_FAILED_JOBS: (name: string) => `/platform/queues/${name}/failed-jobs`,
    QUEUE_RETRY_JOB: (name: string, jobId: string) =>
      `/platform/queues/${name}/jobs/${jobId}/retry`,
    TENANT_LIMITS_OVERRIDE: (id: string) => `/platform/tenants/${id}/limits-override`,
    TENANT_GRACE_PERIOD: (id: string) => `/platform/tenants/${id}/grace-period`,
    TENANT_REVOKE_SESSIONS: (id: string) => `/platform/tenants/${id}/sessions/revoke`,
    TENANT_RESET_MFA: (id: string) => `/platform/tenants/${id}/2fa/reset`,
    TENANT_GDPR_EXPORT: (id: string) => `/platform/tenants/${id}/gdpr/export`,
    TENANT_GDPR_DELETE: (id: string) => `/platform/tenants/${id}/gdpr/delete`
  }
} as const;
