/**
 * Database seed configuration — edit this file to add users, workspaces, and demo data.
 *
 * Run: `pnpm prisma:seed` (local) or `bash scripts/deploy/seed.sh <DATABASE_URL>` (remote)
 * Password for all accounts: SEED_PASSWORD
 */

export const SEED_EMAIL_DOMAIN = "kloqra.dev";
export const SEED_PASSWORD = "password123";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Workspace categories — add entries here or via admin UI after seed. */
export const SEED_CATEGORIES: ReadonlyArray<{ name: string; description: string }> = [];

export type SeedCategoryName = string;

/** Relative logging weight per category for a user persona (1 = baseline). */
export type CategoryBias = Partial<Record<SeedCategoryName, number>>;

export type SeedUserSpec = {
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  defaultHourlyRate: number;
  /** Days of time-log history (0 = none; logs need projects + tasks) */
  historyDays: number;
  /** 0–1 daily logging intensity */
  intensity: number;
  preferences?: { dailyTargetHours?: number; timezone?: string };
  categoryBias?: CategoryBias;
  /** Default true — set false to demo email verification gate */
  emailVerified?: boolean;
  /** Default false — set true to demo forced password change */
  mustChangePassword?: boolean;
};

export type SeedTaskSpec = {
  name: string;
  category: SeedCategoryName;
  billableDefault: boolean;
  weight?: number;
  /** Omit = all project team members; [] = unassigned */
  assigneeEmails?: string[];
};

export type SeedProjectSpec = {
  name: string;
  color: string;
  clientName: string | null;
  budgetHours: number | null;
  budgetBurnPct?: number;
  tasks: SeedTaskSpec[];
  memberEmails: string[];
  timesheetApproval?: boolean;
  memberColorOverrides?: Record<string, string>;
};

export type SeedWorkspaceSpec = {
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  projects: SeedProjectSpec[];
  /** Workspace members (admins from SEED_ADMINS are added automatically). Max 10 total. */
  memberEmails: string[];
};

export type SeedNotificationSpec = {
  recipientEmail: string;
  workspaceSlug: string;
  type:
    | "PROJECT_ASSIGNMENT"
    | "TASK_ASSIGNMENT"
    | "TIMESHEET_STATUS"
    | "APPROVAL_REQUEST"
    | "MEMBER_CHANGE"
    | "WORKSPACE_ADDED";
  title: string;
  body: string;
  read?: boolean;
  projectName?: string;
  metadata?: Record<string, unknown>;
};

export type SeedExportPresetSpec = {
  name: string;
  body: Record<string, unknown>;
};

// ─── Users ───────────────────────────────────────────────────────────────────
// Add admins to SEED_ADMINS and members to SEED_MEMBERS (keep @kloqra.dev emails).

export const SEED_ADMINS: SeedUserSpec[] = [
  {
    email: "admin@kloqra.dev",
    name: "Admin User",
    role: "ADMIN",
    defaultHourlyRate: 150,
    historyDays: 0,
    intensity: 0,
    preferences: { dailyTargetHours: 8, timezone: "America/New_York" }
  }
];

export const SEED_MEMBERS: SeedUserSpec[] = [
  {
    email: "member@kloqra.dev",
    name: "Member User",
    role: "MEMBER",
    defaultHourlyRate: 100,
    historyDays: 0,
    intensity: 0,
    preferences: { dailyTargetHours: 8, timezone: "America/New_York" }
  }
];

export const SEED_USERS: SeedUserSpec[] = [...SEED_ADMINS, ...SEED_MEMBERS];

// ─── Workspaces ──────────────────────────────────────────────────────────────

function workspaceMembers(...memberEmails: string[]): string[] {
  const adminEmails = SEED_ADMINS.map((u) => u.email);
  return [...new Set([...adminEmails, ...memberEmails])].slice(0, 10);
}

export const SEED_WORKSPACES: SeedWorkspaceSpec[] = [
  {
    name: "Softcodeit",
    slug: "softcodeit",
    settings: {
      weekStart: "monday",
      expectedWeeklyHours: 40,
      dailyTargetHours: 8,
      timezone: "America/New_York"
    },
    memberEmails: workspaceMembers("member@kloqra.dev"),
    projects: []
  }
];

// ─── Optional seed data (empty by default) ───────────────────────────────────

export const SEED_NOTIFICATIONS: SeedNotificationSpec[] = [];

export const SEED_EXPORT_PRESETS: SeedExportPresetSpec[] = [];

/** Day-of-week multipliers (0=Sun … 6=Sat) applied during log generation. */
export const DAY_CATEGORY_BOOST: Partial<
  Record<SeedCategoryName, Partial<Record<number, number>>>
> = {};

export const CATEGORY_LOG_DESCRIPTIONS: Record<SeedCategoryName, string[]> = {} as Record<
  SeedCategoryName,
  string[]
>;

export const LOG_DESCRIPTIONS: string[] = [];

// ─── Examples (uncomment and adapt when you need richer demo data) ───────────

/*
// --- Extra admin ---
export const SEED_ADMINS: SeedUserSpec[] = [
  {
    email: "admin@kloqra.dev",
    name: "Admin User",
    role: "ADMIN",
    defaultHourlyRate: 150,
    historyDays: 90,
    intensity: 0.9,
    preferences: { dailyTargetHours: 8, timezone: "America/New_York" },
    categoryBias: { Meetings: 1.5, Documentation: 1.4 }
  },
  {
    email: "ops@kloqra.dev",
    name: "Ops Admin",
    role: "ADMIN",
    defaultHourlyRate: 140,
    historyDays: 60,
    intensity: 0.85,
    preferences: { dailyTargetHours: 7.5, timezone: "America/Chicago" }
  }
];

// --- Extra member ---
export const SEED_MEMBERS: SeedUserSpec[] = [
  {
    email: "member@kloqra.dev",
    name: "Member User",
    role: "MEMBER",
    defaultHourlyRate: 100,
    historyDays: 90,
    intensity: 0.9,
    categoryBias: { "Software Development": 1.5, Meetings: 0.85 }
  },
  {
    email: "alex@kloqra.dev",
    name: "Alex Chen",
    role: "MEMBER",
    defaultHourlyRate: 95,
    historyDays: 30,
    intensity: 0.8
  }
];

// --- Categories (per workspace) ---
export const SEED_CATEGORIES = [
  { name: "Software Development", description: "Engineering and code review" },
  { name: "Meetings", description: "Planning and syncs" },
  { name: "Uncategorized", description: "Default bucket" }
] as const;

// --- Project with tasks (add to SEED_WORKSPACES[0].projects) ---
{
  name: "Client Portal",
  color: "#236bfe",
  clientName: "Example Client",
  budgetHours: 480,
  budgetBurnPct: 0.5,
  timesheetApproval: true,
  memberEmails: workspaceMembers("member@kloqra.dev"),
  tasks: [
    {
      name: "Implementation",
      category: "Software Development",
      billableDefault: true,
      weight: 2
    },
    { name: "Sprint planning", category: "Meetings", billableDefault: true, weight: 1 }
  ]
}

// --- Notifications ---
export const SEED_NOTIFICATIONS: SeedNotificationSpec[] = [
  {
    recipientEmail: "member@kloqra.dev",
    workspaceSlug: "softcodeit",
    type: "WORKSPACE_ADDED",
    title: "Welcome to Softcodeit",
    body: "You were added to the Softcodeit workspace.",
    read: true,
    metadata: { variant: "info", href: "/workspace" }
  },
  {
    recipientEmail: "admin@kloqra.dev",
    workspaceSlug: "softcodeit",
    type: "APPROVAL_REQUEST",
    projectName: "Client Portal",
    title: "Timesheet pending approval",
    body: "A member submitted a timesheet for review.",
    metadata: { variant: "attention", ctaLabel: "Review", href: "/approvals?tab=review" }
  }
];

// --- Export presets (relative dates are resolved at seed time in seed.ts) ---
export const SEED_EXPORT_PRESETS: SeedExportPresetSpec[] = [
  {
    name: "Payroll CSV (30d)",
    body: {
      billable: "all",
      reportTypes: ["time_entries", "by_member"],
      format: "csv",
      relativeFromDays: 30
    }
  }
];

// --- Second workspace ---
export const SEED_WORKSPACES: SeedWorkspaceSpec[] = [
  // ... Softcodeit entry ...
  {
    name: "Meridian Product Co",
    slug: "meridian",
    settings: { weekStart: "monday", expectedWeeklyHours: 40, timezone: "America/Los_Angeles" },
    memberEmails: workspaceMembers("member@kloqra.dev"),
    projects: []
  }
];
*/
