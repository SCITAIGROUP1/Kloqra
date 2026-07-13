/**
 * Responsive layout tiers for shell-contained pages (admin + client).
 *
 * Mac 14" (~1512px viewport, expanded sidebar) → ~1176px shell content (comfortable desktop).
 * 1366×768 laptop (expanded sidebar) → ~1030px shell content (compact laptop).
 */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "kloqra-sidebar-collapsed";

/** Viewport width below which the sidebar auto-collapses on first visit (no saved preference). */
export const COMPACT_LAPTOP_VIEWPORT_MAX = 1400;

/** Shell container width band for compact laptops (sidebar open on 1366px displays). */
export const COMPACT_LAPTOP_SHELL_MIN = 960;
export const COMPACT_LAPTOP_SHELL_MAX = 1100;

/** Shell container width where two-column export / report layouts are comfortable. */
export const COMFORTABLE_DESKTOP_SHELL_MIN = 1101;

/** Shell width where export quick/custom flows use a side-by-side form + download panel. */
export const EXPORT_TWO_COLUMN_SHELL_MIN = 1280;

/** Playwright / manual QA viewport for common 1366×768 laptops. */
export const COMPACT_LAPTOP_VIEWPORT = { width: 1366, height: 768 } as const;
