/** Kloqra brand constants — single source for UI copy, exports, and API touchpoints. */

export const BRAND_NAME = "Kloqra";
export const BRAND_TAGLINE = "Track Time. Unlock Productivity.";
export const BRAND_SUBTAGLINE = "Built for focus, not friction.";

/** Platform-admin portal — internal ops console, not tenant product marketing. */
export const PLATFORM_PORTAL_LABEL = "Platform Admin";
export const PLATFORM_LOGIN_TITLE = "Platform sign in";
export const PLATFORM_LOGIN_DESCRIPTION =
  "Kloqra staff only — authorized access to the internal operations console.";
export const PLATFORM_HERO_TAGLINE = "Operate Kloqra.";
export const PLATFORM_HERO_SUBTAGLINE =
  "Tenant oversight, billing, and platform health — staff access only.";
export const PLATFORM_SECURITY_NOTE = "Protected by two-factor authentication.";

export const BRAND_COLORS = {
  primary: "#236bfe",
  primaryHover: "#1a42c8",
  navy: "#0d2d6e",
  sky: "#93b4ff",
  ice: "#eef2ff",
  mint: "#00c9a7",
  amber: "#f59e42",
  alertRed: "#ef4444",
  indigo: "#a855f7",
  white: "#ffffff",
  surface: "#f8fafc",
  border: "#e2e8f0",
  muted: "#94a3b8",
  body: "#475569",
  dark: "#1e293b",
  black: "#0a0f1e"
} as const;

/** Curated project palette — distinct on light and dark backgrounds. */
export const BRAND_PROJECT_COLORS = [
  BRAND_COLORS.primary,
  BRAND_COLORS.mint,
  BRAND_COLORS.amber,
  BRAND_COLORS.alertRed,
  BRAND_COLORS.indigo,
  BRAND_COLORS.primaryHover,
  BRAND_COLORS.sky,
  BRAND_COLORS.navy
] as const;
