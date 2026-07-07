export { applyDefaultWorkspaceIfNeeded } from "./auth/apply-default-workspace";
export {
  countAdminContexts,
  filterAdminAccessibleWorkspaces,
  resolveAdminContextBreadcrumb,
  shouldShowAdminContextPicker,
  type AdminContextMode,
  type AdminContextBreadcrumbSegment
} from "./auth/admin-context";
export { formatAdminWorkspaceAccessLabel, formatWorkspaceRole } from "./auth/admin-access-label";
export { canAccessAdminApp, canLoginToAdminApp } from "./auth/admin-app-access";
export {
  canAccessAccountMode,
  canAccessAccountPath,
  isPersonalAccountPath,
  canManageOrganization,
  defaultAccountLandingPath,
  isOrganizationOwner,
  isOwnerOnlyAccountPath
} from "./auth/organization-access";
export {
  resolvePlatformContextBreadcrumb,
  type PlatformContextMode,
  type PlatformContextBreadcrumbSegment
} from "./auth/platform-context";
export { hasMultipleWorkspaces } from "./auth/workspace-check";
export { bootstrapSession, type BootstrapResult } from "./auth/bootstrap-session";
export {
  bootstrapPlatformSession,
  logoutPlatformSession,
  tryRefreshPlatformSession,
  type BootstrapPlatformResult
} from "./auth/bootstrap-platform-session";
export { logoutSession } from "./auth/logout";
export { establishTenantSession, establishPlatformSession } from "./auth/establish-tenant-session";
export { useInviteHandoffLogin } from "./auth/use-invite-handoff";
export { verifyEmailWithToken } from "./auth/verify-email-with-token";
export {
  applySessionBoundary,
  getSessionGeneration,
  registerSessionBoundaryHandler,
  SESSION_BOUNDARY_EVENT,
  subscribeSessionGeneration,
  type SessionBoundaryReason
} from "./auth/session-boundary";
export {
  compareSessionIdentity,
  getSessionIdentity,
  type SessionIdentity
} from "./auth/session-identity";
export { useSessionGeneration } from "./hooks/use-session-generation";
export { SessionGenerationBoundary } from "./components/session-generation-boundary";
export {
  readScopedJSON,
  readScopedWithLegacyMigration,
  removeScopedKey,
  scopedStorageKey,
  writeScopedJSON,
  type ScopedStorageIdentity
} from "./storage/scoped-storage";
export { tryRefreshSession } from "./auth/refresh-session";
export { isAccessTokenExpired, readUserIdFromToken } from "./auth/jwt-payload";
export {
  getEffectiveWorkspaceId,
  isWorkspaceMismatchError,
  resolveApiWorkspaceId
} from "./auth/workspace-context";
export {
  api,
  getApiBase,
  publicFetch,
  ApiRequestError,
  clearInflightGetRequestsForPath
} from "./api/client";
export {
  COMPACT_LAPTOP_SHELL_MAX,
  COMPACT_LAPTOP_SHELL_MIN,
  COMPACT_LAPTOP_VIEWPORT,
  COMPACT_LAPTOP_VIEWPORT_MAX,
  COMFORTABLE_DESKTOP_SHELL_MIN,
  EXPORT_TWO_COLUMN_SHELL_MIN,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  TEAM_ACTIVITIES_TABLE_MIN
} from "./responsive-tiers";
export {
  buildWidgetMinSizeMap,
  DASHBOARD_GRID_BREAKPOINTS,
  DASHBOARD_GRID_COLS,
  DASHBOARD_PERSIST_COLS,
  generateResponsiveLayouts,
  isPersistableDashboardBreakpoint,
  type DashboardBreakpoint,
  type DashboardGridLayouts,
  type WidgetMinSize
} from "./dashboard/generate-responsive-layouts";
export { createWidgetLayoutStore } from "./dashboard/create-widget-layout-store";
export type {
  WidgetLayoutItem,
  WidgetLayoutState,
  WidgetLayoutStore,
  WidgetRegistryEntry
} from "./dashboard/create-widget-layout-store";
export {
  fetchListItems,
  fetchPaginatedList,
  invalidateListItemsCache,
  normalizePaginatedListResponse
} from "./api/fetch-list-items";
export { coerceListItems } from "./utils/coerce-list-items";
export { extractFieldErrorsFromMessage, type FieldErrorMap } from "./utils/form-errors";
export { fetchProjectTeam } from "./api/fetch-project-team";
export { appendListQuery, buildListQuery, buildTableQuery } from "./api/list-query";
export { apiDownloadGet, apiDownloadPost, saveDownloadResponse } from "./api/download";
export {
  Providers,
  ThemeToggle,
  WorkspaceSwitcher,
  type WorkspaceSwitcherProps,
  AdminContextBreadcrumb,
  type AdminContextBreadcrumbProps,
  OrganizationContextPanel,
  type OrganizationContextPanelProps,
  PlatformContextBreadcrumb,
  type PlatformContextBreadcrumbProps,
  PlatformContextPanel,
  type PlatformContextPanelProps,
  SentryInitializer,
  BrandMark,
  type BrandMarkProps,
  AuthShell,
  type AuthShellProps,
  ShellHeaderActions,
  type ShellHeaderActionsProps
} from "./client";
export {
  getAccessToken,
  getWorkspaceId,
  syncWorkspaceIdToStorage,
  useSessionStore
} from "./stores/session.store";
export { usePlatformSessionStore, getPlatformAccessToken } from "./stores/platform-session.store";
export { useWorkspacesStore } from "./stores/workspaces.store";
export { toDateInputValue } from "./utils/date-input";
export { resolveStartupPath } from "./utils/startup-page";
export { useDisplayPreferences } from "./hooks/use-display-preferences";
export { usePaginatedList } from "./hooks/use-paginated-list";
export { useRefetchOnWindowFocus } from "./hooks/use-refetch-on-window-focus";
export { useWorkspaceStaleRefetch } from "./hooks/use-workspace-stale-refetch";
export {
  formatNotificationTimeAgo,
  markAllNotificationsRead,
  markNotificationRead,
  useNotificationUnreadCount,
  usePaginatedNotifications,
  useRecentNotifications
} from "./hooks/use-notifications";
export { useNotificationSocket } from "./hooks/use-notification-socket";
export {
  connectNotificationSocket,
  disconnectNotificationSocket,
  forceDisconnectNotificationSocket,
  getNotificationSocketConnectionState,
  subscribeNotificationConnection,
  subscribeNotificationPush,
  subscribeWorkspaceDataStale,
  type NotificationSocketConnectionState
} from "./realtime/notification-socket-manager";
export { activateNotification } from "./features/notifications/notification-actions";
export {
  WORKSPACE_DATA_STALE_EVENT,
  dispatchWorkspaceDataStale,
  invalidateWorkspaceData,
  registerWorkspaceDataInvalidation,
  scopesForNotificationType,
  type WorkspaceDataStaleDetail
} from "./realtime/workspace-data-sync";
export {
  TIMELOG_INVALIDATE_SCOPES,
  commitTimelogMutation,
  invalidateTimelogData
} from "./realtime/timelog-data-sync";
export { AppQueryProvider } from "./query/app-query-provider";
export { resetQueryClient } from "./query/query-client";
export { invalidateTimelogQueries } from "./query/invalidate-timelog-queries";
export {
  applyTimelogCachePatch,
  removeTimelogFromListCaches,
  upsertTimelogInListCaches,
  type TimelogCachePatch
} from "./query/patch-timelog-list-caches";
export { timelogQueryKeys } from "./query/timelog-query-keys";
export { useTimelogListQuery, useTimelogListAllQuery } from "./query/use-timelog-list-query";
export { useTimelogQuerySync } from "./query/use-timelog-query-sync";
export { useClientTablePagination } from "./hooks/use-client-table-pagination";
export { fetchUserProfile } from "./stores/user-profile.store";
export {
  applyDashboardPeriodPreset,
  matchDashboardPeriodPreset,
  localMidnightUtcInZone,
  todayInZone,
  toDateKeyInZone,
  getTimezoneOffsetMs,
  type DashboardPeriodPreset
} from "./utils/dashboard-period-presets";
export {
  ReportScopeFilters,
  type ReportScopeFilterValues,
  type ScopeMember
} from "./components/report-scope-filters";
export { DashboardArrangeBanner } from "./components/dashboard-arrange-banner";
export {
  DashboardPeriodFilter,
  type DashboardPeriodFilterOption,
  type DashboardPeriodFilterProps,
  type DashboardPeriodSelection
} from "./components/dashboard-period-filter";
export {
  ProjectOverviewStats,
  type ProjectOverviewStatsProps
} from "./components/project-overview-stats";
export { SetPasswordForm } from "./features/account/set-password-form";
export { ForgotPasswordForm } from "./features/auth/forgot-password-form";
export { ResetPasswordForm } from "./features/auth/reset-password-form";
export { PlatformSetup2faForm } from "./features/auth/platform-setup-2fa-form";
export { VerifyEmailPageContent } from "./features/auth/verify-email-page-content";
export { usePublicPlans } from "./features/auth/use-public-plans";
export {
  useOrgLoginBranding,
  orgLoginDescription,
  type OrgLoginBranding
} from "./features/auth/use-org-login-branding";
export { ORG_SLUG_COOKIE, readOrgSlugCookie } from "./features/auth/org-slug-cookie";
export { CopyableValue } from "./components/copyable-value";
export { WorkspaceSelectForm } from "./features/auth/workspace-select-form";
export { AdminContextSelectForm } from "./features/auth/admin-context-select-form";
export type { WorkspaceCheckOptions } from "./auth/workspace-check";
export { AccountSettingsPage } from "./features/account/account-settings-page";
export { NotificationsPage } from "./features/notifications/notifications-page";
export { ProfilePage } from "./features/account/profile-page";
export { IntegrationsSection } from "./features/account/profile/integrations-section";
export { useUserProfile } from "./features/account/use-user-profile";
export { useTenantCurrent } from "./features/tenant/use-tenant-current";
export { useUpdateTenantCurrent } from "./features/tenant/use-update-tenant-current";
export { useTenantOverview } from "./features/tenant/use-tenant-overview";
export { useTenantAnalyticsSummary } from "./features/tenant/use-tenant-analytics-summary";
export { useTenantMembers } from "./features/tenant/use-tenant-members";
export { useTenantSubscription } from "./features/tenant/use-tenant-subscription";
export {
  isExportInProgress,
  isStaleExportJob,
  useTenantDataExport
} from "./features/tenant/use-tenant-data-export";
export { LegalFooterLinks, getLegalUrls } from "./components/legal-footer";
export {
  useCreateCheckoutSession,
  useChangeSubscriptionPlan,
  useCreatePortalSession,
  useSalesInquiry,
  useSubmitSalesInquiry,
  useUploadSalesReceipt
} from "./features/tenant/use-subscription-billing";
export { usePlatformPlans } from "./features/platform/use-platform-plans";
export { usePricingPlans } from "./features/plan/use-pricing-plans";
export {
  BILLING_INTERVAL_OPTIONS,
  buildPricingTiersFromCatalog,
  buildPricingTiersFromPlans,
  isPaidCheckoutTier,
  isTierCurrent,
  planSlugForTierName,
  resolveTierPriceDisplay,
  type BillingInterval,
  type PlanPricingTier
} from "./plan/pricing-tier";
export { PlanPricingCard, type PlanPricingCardProps } from "./plan/plan-pricing-card";
export { formatPlanPriceUsd } from "@kloqra/contracts";
export { usePlatformOpsSummary } from "./features/platform/use-platform-ops-summary";
export {
  usePlatformAuditEvents,
  type PlatformAuditAction
} from "./features/platform/use-platform-audit-events";
export { usePlatformTenants } from "./features/platform/use-platform-tenants";
export { usePlatformTenantDetail } from "./features/platform/use-platform-tenant-detail";
export { usePlatformSubscriptions } from "./features/platform/use-platform-subscriptions";
export { usePlatformSubscriptionDetail } from "./features/platform/use-platform-subscription-detail";
export { usePlatformSubscriptionWorkQueue } from "./features/platform/use-platform-subscription-work-queue";
export {
  usePlatformStaff,
  type PlatformStaffListResponseDto
} from "./features/platform/use-platform-staff";
export { PlatformProfilePage } from "./features/platform-account/platform-profile-page";
export { PlatformAccountSettingsPage } from "./features/platform-account/platform-account-settings-page";
export { PlatformNotificationsPage } from "./features/platform-notifications/platform-notifications-page";
export { usePlatformUserProfile } from "./features/platform-account/use-platform-user-profile";
export {
  formatPlatformNotificationTimeAgo,
  markAllPlatformNotificationsRead,
  markPlatformNotificationRead,
  usePlatformNotificationUnreadCount,
  usePaginatedPlatformNotifications,
  useRecentPlatformNotifications
} from "./hooks/use-platform-notifications";
export { usePlatformNotificationSocket } from "./hooks/use-platform-notification-socket";
export { resolveAdminLandingPath } from "./auth/resolve-admin-landing-path";
export { resolveAdminOnboardingPath } from "./auth/resolve-admin-onboarding-path";
export { resolveAdminPostAuthPath } from "./auth/resolve-admin-post-auth-path";
export {
  isPendingWorkspaceSetup,
  isAllowedDuringWorkspaceSetup,
  resolveWorkspaceSetupRedirect
} from "./auth/tenant-onboarding";
export { SettingsCard } from "./features/account/settings/settings-card";
export { SettingsSaveBar } from "./features/account/settings/settings-save-bar";
export {
  appendApprovalsFilterSearch,
  buildAdminApprovalsHref,
  buildApprovalsCountQueryString,
  buildApprovalsFilterQueryString,
  buildApprovalsListQueryString,
  buildMemberSubmissionsHref,
  withApprovalsListPagination,
  APPROVALS_TABLE_PAGE_SIZE,
  hasActiveApprovalsFilter,
  parseAdminApprovalsSearch,
  parseApprovalsFilterSearch,
  parseMemberSubmissionsSearch,
  resolveMemberSubmissionsTab,
  type AdminApprovalsDeepLink,
  type MemberSubmissionsDeepLink,
  type MemberSubmissionsTab
} from "./features/submissions/submission-deep-link";
export {
  buildMemberTimesheetHref,
  buildMemberTimesheetHrefFromSubmission,
  parseMemberTimesheetSearch,
  viewForApprovalPeriod,
  type MemberTimesheetDeepLink,
  type MemberTimesheetView
} from "./features/timesheet/timesheet-deep-link";
export {
  PasswordStrengthIndicator,
  calculatePasswordStrength
} from "./components/password-strength-indicator";

export { SupportTicketForm } from "./components/support-ticket-form";
