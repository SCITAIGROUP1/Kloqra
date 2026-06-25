/** Realistic hierarchy seed — platform admin, tenant owner, tenant admin, workspace admins, project managers, members. */
/** Dashboard widget layouts for demo users are applied in seed-dashboard-layouts.ts (stored in users.preferences.dashboardLayouts). */

import { DEFAULT_PLAN_LIMITS, PLAN_IDS, PLAN_SLUGS, type PlanSlug } from "@kloqra/contracts";

export const SEED_EMAIL_DOMAIN = "kloqra.dev";

const SEED_STRIPE_DEFAULTS = {
  starterProduct: "prod_test_starter",
  proProduct: "prod_test_pro",
  starterPrice: "price_test_starter",
  proPrice: "price_test_pro"
} as const;

function distinctSeedStripeId(
  envValue: string | undefined,
  fallback: string,
  otherEnvValue: string | undefined
): string {
  const trimmed = envValue?.trim();
  const otherTrimmed = otherEnvValue?.trim();
  if (!trimmed) return fallback;
  if (otherTrimmed && trimmed === otherTrimmed) return fallback;
  return trimmed;
}

/** SaaS plan catalog — stable IDs match migration backfill (F09). */
export const SEED_STRIPE_PRICE_IDS = {
  starter: distinctSeedStripeId(
    process.env.STRIPE_PRICE_STARTER,
    SEED_STRIPE_DEFAULTS.starterPrice,
    process.env.STRIPE_PRICE_PRO
  ),
  pro: distinctSeedStripeId(
    process.env.STRIPE_PRICE_PRO,
    SEED_STRIPE_DEFAULTS.proPrice,
    process.env.STRIPE_PRICE_STARTER
  )
} as const;

export const SEED_STRIPE_PRODUCT_IDS = {
  starter: distinctSeedStripeId(
    process.env.STRIPE_PRODUCT_STARTER,
    SEED_STRIPE_DEFAULTS.starterProduct,
    process.env.STRIPE_PRODUCT_PRO
  ),
  pro: distinctSeedStripeId(
    process.env.STRIPE_PRODUCT_PRO,
    SEED_STRIPE_DEFAULTS.proProduct,
    process.env.STRIPE_PRODUCT_STARTER
  )
} as const;

export const SEED_PLANS = [
  {
    id: PLAN_IDS[PLAN_SLUGS.PILOT],
    name: "Enterprise",
    slug: PLAN_SLUGS.PILOT as PlanSlug,
    limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PILOT],
    isPublic: false,
    sortOrder: 3,
    stripeProductId: null,
    stripePriceId: null,
    tagline: "Custom limits, onboarding, and support for larger organizations.",
    monthlyPriceCents: null,
    yearlyPriceCents: null,
    features: ["Dedicated account manager", "Custom integrations", "Enterprise SLAs"],
    recommended: false,
    billingMode: "contact" as const,
    contactHref: null,
    visibleOnPricing: true
  },
  {
    id: PLAN_IDS[PLAN_SLUGS.STARTER],
    name: "Starter",
    slug: PLAN_SLUGS.STARTER as PlanSlug,
    limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.STARTER],
    isPublic: true,
    sortOrder: 1,
    stripeProductId: SEED_STRIPE_PRODUCT_IDS.starter,
    stripePriceId: SEED_STRIPE_PRICE_IDS.starter,
    tagline: "Ideal for small teams getting started with time tracking.",
    monthlyPriceCents: 2900,
    yearlyPriceCents: 29000,
    features: [],
    recommended: false,
    billingMode: "stripe" as const,
    contactHref: null,
    visibleOnPricing: true
  },
  {
    id: PLAN_IDS[PLAN_SLUGS.PRO],
    name: "Pro",
    slug: PLAN_SLUGS.PRO as PlanSlug,
    limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PRO],
    isPublic: true,
    sortOrder: 2,
    stripeProductId: SEED_STRIPE_PRODUCT_IDS.pro,
    stripePriceId: SEED_STRIPE_PRICE_IDS.pro,
    tagline: "For growing organizations that need more capacity and control.",
    monthlyPriceCents: 9900,
    yearlyPriceCents: 99000,
    features: ["Priority email support"],
    recommended: true,
    billingMode: "stripe" as const,
    contactHref: null,
    visibleOnPricing: true
  }
] as const;

export const SEED_PRICING_BASELINE_FEATURES = [
  "Time tracking and timesheets",
  "Approval workflows",
  "Exports and reporting",
  "Mobile-friendly access"
] as const;

/** Demo tenant subscription — pilot plan, active (not trial) for stable demos. */
export const SEED_TENANT_SUBSCRIPTION = {
  planSlug: PLAN_SLUGS.PILOT as PlanSlug,
  status: "active" as const
};

/** Demo organization — all SEED_WORKSPACES belong to this tenant (SaaS-F02). */
export const SEED_TENANT = {
  name: "Kloqra Demo Organization",
  slug: "kloqra-demo",
  status: "active" as const,
  settings: {
    industry: "demo",
    timezone: "America/New_York"
  },
  /** Tenant-level roles only (OWNER / ADMIN). Workspace admins are workspace_members only. */
  members: [
    { email: "admin@kloqra.dev", role: "OWNER" as const },
    { email: "ops@kloqra.dev", role: "ADMIN" as const }
  ]
};

/** Canonical workspace categories (matches admin onboarding + migration backfill naming). */
export const SEED_CATEGORIES = [
  { name: "Software Development", description: "Engineering, coding, and code review work" },
  { name: "UI/UX Design", description: "Design, branding, and design-system work" },
  { name: "Meetings", description: "Planning, kickoffs, syncs, and stakeholder calls" },
  { name: "QA & Testing", description: "Test design, regression, and quality assurance" },
  { name: "DevOps", description: "Infrastructure, CI/CD, and platform engineering" },
  { name: "Documentation", description: "User guides, API references, and runbooks" },
  {
    name: "Uncategorized",
    description: "Default bucket for unclassified tasks (migration backfill name)"
  }
] as const;

export type SeedCategoryName = (typeof SEED_CATEGORIES)[number]["name"];

/** Relative logging weight per category for a user persona (1 = baseline). */
export type CategoryBias = Partial<Record<SeedCategoryName, number>>;

export type SeedUserSpec = {
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  defaultHourlyRate: number;
  /** Days of time-log history (30–90) */
  historyDays: number;
  /** 0–1 daily logging intensity */
  intensity: number;
  preferences?: { dailyTargetHours?: number; timezone?: string };
  /** Skews which categories this person logs time against */
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
  /** Relative weight when picking tasks for logs (default 1) */
  weight?: number;
  /**
   * Task assignees by email. Omit = all project team members.
   * Empty array = unassigned (hidden from members until admin assigns).
   */
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
  /** Subset of memberEmails — team_members.role = PROJECT_MANAGER (demo: 2 per project). */
  leadEmails?: string[];
  timesheetApproval?: boolean;
  /** Per-member personal project colors (email → hex). Admin canonical color unchanged. */
  memberColorOverrides?: Record<string, string>;
};

export const SEED_PASSWORD = "password123";

/** Canonical demo accounts — one persona per hierarchy level (see SEED_DEMO_HIERARCHY). */
export const SEED_DEMO_PERSONAS = {
  platformAdmin: process.env.PLATFORM_SUPERADMIN_EMAIL ?? "platform@kloqra.dev",
  tenantOwner: "admin@kloqra.dev",
  tenantAdmin: "ops@kloqra.dev",
  acmeWorkspaceAdmin: "acme-admin@kloqra.dev",
  meridianWorkspaceAdmin: "meridian-admin@kloqra.dev",
  projectManager: "alex@kloqra.dev",
  member: "member@kloqra.dev"
} as const;

/** Human-readable hierarchy for docs, seed output, and tests. */
export const SEED_DEMO_HIERARCHY = [
  {
    level: "Platform",
    email: SEED_DEMO_PERSONAS.platformAdmin,
    displayName: "Kloqra Platform Admin",
    scope: "Cross-tenant operations",
    app: "platform-admin"
  },
  {
    level: "Organization owner",
    email: SEED_DEMO_PERSONAS.tenantOwner,
    displayName: "Avery Org Owner",
    scope: "Billing, org members, all workspaces (account mode)",
    app: "admin → Organization"
  },
  {
    level: "Organization admin",
    email: SEED_DEMO_PERSONAS.tenantAdmin,
    displayName: "Morgan Org Admin",
    scope: "Org profile, workspace creation, workspace-admin assignment (Acme only)",
    app: "admin → Organization"
  },
  {
    level: "Workspace admin (Acme)",
    email: SEED_DEMO_PERSONAS.acmeWorkspaceAdmin,
    displayName: "Casey Acme Admin",
    scope: "Acme Corporation workspace ops only",
    app: "admin → Workspace"
  },
  {
    level: "Workspace admin (Meridian)",
    email: SEED_DEMO_PERSONAS.meridianWorkspaceAdmin,
    displayName: "Riley Meridian Admin",
    scope: "Meridian Product Co workspace ops only",
    app: "admin → Workspace"
  },
  {
    level: "Project manager",
    email: SEED_DEMO_PERSONAS.projectManager,
    displayName: "Alex Chen",
    scope: "Project PROJECT_MANAGER on both workspaces",
    app: "admin (project-lead subset)"
  },
  {
    level: "Member",
    email: SEED_DEMO_PERSONAS.member,
    displayName: "Sam Rivera",
    scope: "Time tracking only",
    app: "client"
  }
] as const;

/** Kloqra platform superadmin — `apps/platform-admin` (SaaS-F14). */
export const SEED_PLATFORM_SUPERADMIN = {
  email: process.env.PLATFORM_SUPERADMIN_EMAIL ?? "platform@kloqra.dev",
  password: process.env.PLATFORM_SUPERADMIN_PASSWORD ?? SEED_PASSWORD,
  name: "Kloqra Platform Admin"
} as const;

/** Demo users — workspace role is set per workspace via workspaceAdminEmails, not user.role. */
export const SEED_USERS: SeedUserSpec[] = [
  {
    email: "admin@kloqra.dev",
    name: "Avery Org Owner",
    role: "MEMBER",
    defaultHourlyRate: 150,
    historyDays: 90,
    intensity: 0.95,
    preferences: { dailyTargetHours: 8, timezone: "America/New_York" },
    categoryBias: { Meetings: 1.5, Documentation: 1.4, "Software Development": 0.75 }
  },
  {
    email: "ops@kloqra.dev",
    name: "Morgan Org Admin",
    role: "MEMBER",
    defaultHourlyRate: 140,
    historyDays: 90,
    intensity: 0.9,
    preferences: { dailyTargetHours: 7.5, timezone: "America/Chicago" },
    categoryBias: { DevOps: 1.8, Meetings: 1.3, "Software Development": 0.9 }
  },
  {
    email: "acme-admin@kloqra.dev",
    name: "Casey Acme Admin",
    role: "MEMBER",
    defaultHourlyRate: 135,
    historyDays: 90,
    intensity: 0.88,
    preferences: { dailyTargetHours: 8, timezone: "America/Denver" },
    categoryBias: { Meetings: 1.4, Documentation: 1.3, "Software Development": 0.85 }
  },
  {
    email: "meridian-admin@kloqra.dev",
    name: "Riley Meridian Admin",
    role: "MEMBER",
    defaultHourlyRate: 132,
    historyDays: 90,
    intensity: 0.86,
    preferences: { dailyTargetHours: 8, timezone: "America/Los_Angeles" },
    categoryBias: { Meetings: 1.3, Documentation: 1.2, "Software Development": 0.9 }
  },
  {
    email: "member@kloqra.dev",
    name: "Sam Rivera",
    role: "MEMBER",
    defaultHourlyRate: 100,
    historyDays: 90,
    intensity: 0.92,
    categoryBias: { "Software Development": 1.5, "QA & Testing": 1.25, Meetings: 0.85 }
  },
  {
    email: "alex@kloqra.dev",
    name: "Alex Chen",
    role: "MEMBER",
    defaultHourlyRate: 95,
    historyDays: 90,
    intensity: 0.88,
    categoryBias: { "Software Development": 1.7, "QA & Testing": 0.9 }
  },
  {
    email: "jordan@kloqra.dev",
    name: "Jordan Lee",
    role: "MEMBER",
    defaultHourlyRate: 110,
    historyDays: 90,
    intensity: 0.9,
    categoryBias: { "Software Development": 2.0, DevOps: 0.8 }
  },
  {
    email: "taylor@kloqra.dev",
    name: "Taylor Brooks",
    role: "MEMBER",
    defaultHourlyRate: 88,
    historyDays: 90,
    intensity: 0.85,
    categoryBias: { "UI/UX Design": 2.2, Meetings: 1.1 }
  },
  {
    email: "riley@kloqra.dev",
    name: "Riley Kim",
    role: "MEMBER",
    defaultHourlyRate: 105,
    historyDays: 90,
    intensity: 0.87,
    categoryBias: { "QA & Testing": 2.1, "Software Development": 0.75 }
  },
  {
    email: "casey@kloqra.dev",
    name: "Casey Nguyen",
    role: "MEMBER",
    defaultHourlyRate: 92,
    historyDays: 90,
    intensity: 0.84,
    categoryBias: { Documentation: 1.6, "Software Development": 1.1, Meetings: 1.2 }
  },
  {
    email: "drew@kloqra.dev",
    name: "Drew Martinez",
    role: "MEMBER",
    defaultHourlyRate: 102,
    historyDays: 90,
    intensity: 0.82,
    categoryBias: { DevOps: 2.0, "Software Development": 1.0 }
  },
  {
    email: "sage@kloqra.dev",
    name: "Sage Patel",
    role: "MEMBER",
    defaultHourlyRate: 94,
    historyDays: 90,
    intensity: 0.8,
    categoryBias: { Documentation: 1.8, Meetings: 1.15 }
  },
  {
    email: "blake@kloqra.dev",
    name: "Blake Wilson",
    role: "MEMBER",
    defaultHourlyRate: 108,
    historyDays: 90,
    intensity: 0.78,
    categoryBias: { "UI/UX Design": 1.5, Meetings: 1.25, Documentation: 1.1 }
  }
];

export type SeedWorkspaceSpec = {
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  projects: SeedProjectSpec[];
  /** Emails with workspace_members rows (role MEMBER unless listed in workspaceAdminEmails). */
  memberEmails: string[];
  /** Subset of memberEmails promoted to workspace_members.role = ADMIN. */
  workspaceAdminEmails?: string[];
};

function projectTeam(
  leads: [string, string],
  members: [string, string, string]
): Pick<SeedProjectSpec, "memberEmails" | "leadEmails"> {
  return { memberEmails: [...leads, ...members], leadEmails: [...leads] };
}

export const SEED_WORKSPACES: SeedWorkspaceSpec[] = [
  {
    name: "Acme Corporation",
    slug: "acme",
    settings: {
      weekStart: "monday",
      expectedWeeklyHours: 40,
      dailyTargetHours: 8,
      timezone: "America/New_York",
      exportFooterNote: "Acme Corporation — Kloqra confidential billing export"
    },
    workspaceAdminEmails: [
      SEED_DEMO_PERSONAS.tenantOwner,
      SEED_DEMO_PERSONAS.tenantAdmin,
      SEED_DEMO_PERSONAS.acmeWorkspaceAdmin
    ],
    memberEmails: [
      SEED_DEMO_PERSONAS.tenantOwner,
      SEED_DEMO_PERSONAS.tenantAdmin,
      SEED_DEMO_PERSONAS.acmeWorkspaceAdmin,
      SEED_DEMO_PERSONAS.projectManager,
      SEED_DEMO_PERSONAS.member,
      "jordan@kloqra.dev",
      "taylor@kloqra.dev",
      "riley@kloqra.dev",
      "casey@kloqra.dev",
      "drew@kloqra.dev",
      "sage@kloqra.dev",
      "blake@kloqra.dev"
    ],
    projects: [
      {
        name: "Client Portal Redesign",
        color: "#236bfe",
        clientName: "Northwind Traders",
        budgetHours: 480,
        budgetBurnPct: 0.82,
        ...projectTeam(
          ["alex@kloqra.dev", "jordan@kloqra.dev"],
          ["member@kloqra.dev", "taylor@kloqra.dev", "riley@kloqra.dev"]
        ),
        memberColorOverrides: {
          "member@kloqra.dev": "#8b5cf6"
        },
        tasks: [
          {
            name: "UX research",
            category: "UI/UX Design",
            billableDefault: true,
            weight: 1.4,
            assigneeEmails: ["member@kloqra.dev"]
          },
          {
            name: "Wireframes & flows",
            category: "UI/UX Design",
            billableDefault: true,
            weight: 1.6
          },
          {
            name: "Component build",
            category: "Software Development",
            billableDefault: true,
            weight: 2.2,
            assigneeEmails: ["jordan@kloqra.dev", "alex@kloqra.dev"]
          },
          {
            name: "API integration",
            category: "Software Development",
            billableDefault: true,
            weight: 2.0
          },
          {
            name: "Code review",
            category: "Software Development",
            billableDefault: true,
            weight: 1.2
          },
          { name: "E2E test suite", category: "QA & Testing", billableDefault: true, weight: 1.5 },
          { name: "QA pass", category: "QA & Testing", billableDefault: true, weight: 1.3 },
          { name: "CI pipeline", category: "DevOps", billableDefault: true, weight: 0.9 },
          {
            name: "Sprint planning",
            category: "Meetings",
            billableDefault: true,
            weight: 1.1,
            assigneeEmails: ["member@kloqra.dev", "jordan@kloqra.dev"]
          },
          { name: "Stakeholder review", category: "Meetings", billableDefault: true, weight: 1.0 },
          {
            name: "Release notes",
            category: "Documentation",
            billableDefault: true,
            weight: 0.8,
            assigneeEmails: []
          }
        ],
        timesheetApproval: true
      },
      {
        name: "Brand Campaign Q2",
        color: "#f59e0b",
        clientName: "Fabrikam Media",
        budgetHours: 220,
        budgetBurnPct: 0.94,
        ...projectTeam(
          ["casey@kloqra.dev", "drew@kloqra.dev"],
          ["taylor@kloqra.dev", "sage@kloqra.dev", "blake@kloqra.dev"]
        ),
        memberColorOverrides: {
          "taylor@kloqra.dev": "#ec4899"
        },
        tasks: [
          {
            name: "Creative direction",
            category: "UI/UX Design",
            billableDefault: true,
            weight: 2.0
          },
          {
            name: "Asset production",
            category: "UI/UX Design",
            billableDefault: true,
            weight: 1.8
          },
          {
            name: "Brand guidelines",
            category: "Documentation",
            billableDefault: true,
            weight: 1.2
          },
          {
            name: "Media buying analysis",
            category: "Meetings",
            billableDefault: true,
            weight: 1.4
          },
          { name: "Client presentation", category: "Meetings", billableDefault: true, weight: 1.3 },
          {
            name: "Performance report",
            category: "Documentation",
            billableDefault: true,
            weight: 1.0
          },
          { name: "Ad QA review", category: "QA & Testing", billableDefault: true, weight: 0.7 }
        ]
      },
      {
        name: "Support Retainer",
        color: "#10b981",
        clientName: "Contoso Retail",
        budgetHours: 160,
        budgetBurnPct: 1.08,
        ...projectTeam(
          ["member@kloqra.dev", "drew@kloqra.dev"],
          ["alex@kloqra.dev", "jordan@kloqra.dev", "riley@kloqra.dev"]
        ),
        tasks: [
          {
            name: "Ticket triage",
            category: "Software Development",
            billableDefault: true,
            weight: 1.8
          },
          { name: "Hotfix deployment", category: "DevOps", billableDefault: true, weight: 2.0 },
          { name: "Incident postmortem", category: "Meetings", billableDefault: true, weight: 1.1 },
          { name: "SLA reporting", category: "Documentation", billableDefault: true, weight: 1.4 },
          {
            name: "Regression sweep",
            category: "QA & Testing",
            billableDefault: true,
            weight: 1.2
          },
          { name: "Runbook update", category: "Documentation", billableDefault: true, weight: 1.0 }
        ],
        timesheetApproval: true
      }
    ]
  },
  {
    name: "Meridian Product Co",
    slug: "meridian",
    settings: {
      weekStart: "monday",
      expectedWeeklyHours: 40,
      dailyTargetHours: 8,
      timezone: "America/Los_Angeles",
      timesheetApprovalPeriod: "weekly"
    },
    workspaceAdminEmails: [
      SEED_DEMO_PERSONAS.tenantOwner,
      SEED_DEMO_PERSONAS.tenantAdmin,
      SEED_DEMO_PERSONAS.meridianWorkspaceAdmin
    ],
    memberEmails: [
      SEED_DEMO_PERSONAS.tenantOwner,
      SEED_DEMO_PERSONAS.meridianWorkspaceAdmin,
      SEED_DEMO_PERSONAS.projectManager,
      SEED_DEMO_PERSONAS.member,
      "jordan@kloqra.dev",
      "taylor@kloqra.dev",
      "riley@kloqra.dev",
      "casey@kloqra.dev",
      "drew@kloqra.dev",
      "sage@kloqra.dev",
      "blake@kloqra.dev"
    ],
    projects: [
      {
        name: "Mobile App v3",
        color: "#0ea5e9",
        clientName: null,
        budgetHours: 620,
        budgetBurnPct: 0.68,
        ...projectTeam(
          ["alex@kloqra.dev", "taylor@kloqra.dev"],
          ["member@kloqra.dev", "riley@kloqra.dev", "drew@kloqra.dev"]
        ),
        tasks: [
          {
            name: "iOS features",
            category: "Software Development",
            billableDefault: false,
            weight: 2.2
          },
          {
            name: "Android parity",
            category: "Software Development",
            billableDefault: false,
            weight: 2.0
          },
          {
            name: "Push notifications",
            category: "Software Development",
            billableDefault: false,
            weight: 1.5
          },
          {
            name: "Mobile design QA",
            category: "UI/UX Design",
            billableDefault: false,
            weight: 1.2
          },
          {
            name: "Release candidate",
            category: "QA & Testing",
            billableDefault: false,
            weight: 1.8
          },
          {
            name: "Device farm runs",
            category: "QA & Testing",
            billableDefault: false,
            weight: 1.4
          },
          { name: "App store deploy", category: "DevOps", billableDefault: false, weight: 0.9 },
          { name: "Sprint demo", category: "Meetings", billableDefault: false, weight: 1.0 }
        ]
      },
      {
        name: "Platform API",
        color: "#8b5cf6",
        clientName: null,
        budgetHours: 400,
        budgetBurnPct: 0.76,
        ...projectTeam(
          ["alex@kloqra.dev", "casey@kloqra.dev"],
          ["blake@kloqra.dev", "sage@kloqra.dev", "drew@kloqra.dev"]
        ),
        memberColorOverrides: {
          "alex@kloqra.dev": "#06b6d4"
        },
        tasks: [
          {
            name: "Endpoint design",
            category: "Software Development",
            billableDefault: false,
            weight: 1.8,
            assigneeEmails: ["alex@kloqra.dev", "drew@kloqra.dev"]
          },
          {
            name: "Auth hardening",
            category: "Software Development",
            billableDefault: false,
            weight: 1.6
          },
          {
            name: "Rate limiting",
            category: "Software Development",
            billableDefault: false,
            weight: 1.4
          },
          {
            name: "API contract review",
            category: "Meetings",
            billableDefault: false,
            weight: 1.0
          },
          {
            name: "OpenAPI docs",
            category: "Documentation",
            billableDefault: false,
            weight: 1.5,
            assigneeEmails: []
          },
          {
            name: "Load test harness",
            category: "QA & Testing",
            billableDefault: false,
            weight: 1.2
          },
          { name: "K8s rollout", category: "DevOps", billableDefault: false, weight: 1.3 }
        ]
      },
      {
        name: "Security Hardening",
        color: "#ef4444",
        clientName: null,
        budgetHours: 200,
        budgetBurnPct: 0.91,
        ...projectTeam(
          ["alex@kloqra.dev", "member@kloqra.dev"],
          ["casey@kloqra.dev", "riley@kloqra.dev", "blake@kloqra.dev"]
        ),
        tasks: [
          {
            name: "Pen test remediation",
            category: "QA & Testing",
            billableDefault: false,
            weight: 1.8
          },
          { name: "Vuln triage call", category: "Meetings", billableDefault: false, weight: 1.2 },
          { name: "Secrets rotation", category: "DevOps", billableDefault: false, weight: 2.0 },
          { name: "WAF tuning", category: "DevOps", billableDefault: false, weight: 1.4 },
          { name: "SOC2 evidence", category: "Documentation", billableDefault: false, weight: 1.5 },
          {
            name: "Patch validation",
            category: "Software Development",
            billableDefault: false,
            weight: 1.0
          }
        ],
        timesheetApproval: true
      }
    ]
  }
];

/** Day-of-week multipliers (0=Sun … 6=Sat) applied during log generation. */
export const DAY_CATEGORY_BOOST: Partial<
  Record<SeedCategoryName, Partial<Record<number, number>>>
> = {
  Meetings: { 1: 2.0, 5: 1.5, 3: 1.1 },
  "QA & Testing": { 4: 1.6, 2: 1.1 },
  DevOps: { 3: 1.35, 2: 1.15 },
  Documentation: { 5: 1.4, 4: 1.1 },
  "Software Development": { 2: 1.2, 3: 1.15, 4: 1.1 }
};

export const CATEGORY_LOG_DESCRIPTIONS: Record<SeedCategoryName, string[]> = {
  "Software Development": [
    "Feature implementation",
    "Code review",
    "Bug fix",
    "Refactor",
    "Pairing session",
    "API wiring",
    "Performance tuning"
  ],
  "UI/UX Design": [
    "Wireframe iteration",
    "Design handoff",
    "Prototype review",
    "Asset export",
    "Design QA",
    "Component spec"
  ],
  Meetings: [
    "Sprint planning",
    "Client call",
    "Stakeholder sync",
    "Standup",
    "Workshop facilitation",
    "Steering committee",
    "Status update"
  ],
  "QA & Testing": [
    "Regression testing",
    "QA pass",
    "Test case authoring",
    "Release validation",
    "Integration testing",
    "UAT support"
  ],
  DevOps: [
    "Deployment prep",
    "CI pipeline fix",
    "Incident response",
    "Infra change",
    "Secrets rotation",
    "Monitoring setup"
  ],
  Documentation: [
    "Runbook update",
    "API reference",
    "Release notes",
    "User guide",
    "Executive summary",
    "Comms draft"
  ],
  Uncategorized: ["General work", "Ad-hoc task", "Miscellaneous"]
};

export const LOG_DESCRIPTIONS = [
  "Sprint planning",
  "Implementation",
  "Code review",
  "Bug fix",
  "Client call",
  "Documentation",
  "Refactor",
  "QA pass",
  "Design handoff",
  "Deployment prep",
  "Stakeholder sync",
  "Scope refinement",
  "Integration testing",
  "Incident response",
  "Backlog grooming",
  "Pairing session",
  "Release validation",
  "Invoice prep",
  "Capacity planning",
  "Vendor review",
  "Regression testing",
  "Status update",
  "Workshop facilitation",
  "Data migration",
  "Contract review"
];

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

/** Sample inbox rows for demo accounts (resolved to workspace/project IDs at seed time). */
export const SEED_NOTIFICATIONS: SeedNotificationSpec[] = [
  {
    recipientEmail: "member@kloqra.dev",
    workspaceSlug: "acme",
    type: "WORKSPACE_ADDED",
    title: "Welcome to Acme Corporation",
    body: "You were added to the Acme Corporation workspace.",
    read: true,
    metadata: { variant: "info", href: "/workspace" }
  },
  {
    recipientEmail: "member@kloqra.dev",
    workspaceSlug: "acme",
    type: "PROJECT_ASSIGNMENT",
    projectName: "Client Portal Redesign",
    title: "Added to Client Portal Redesign",
    body: "You have been assigned to the Client Portal Redesign project.",
    metadata: { variant: "info", ctaLabel: "View project" }
  },
  {
    recipientEmail: "member@kloqra.dev",
    workspaceSlug: "acme",
    type: "TASK_ASSIGNMENT",
    projectName: "Client Portal Redesign",
    title: "Assigned to UX research",
    body: "You were assigned to the UX research task on Client Portal Redesign.",
    metadata: { variant: "info", ctaLabel: "Open task" }
  },
  {
    recipientEmail: "member@kloqra.dev",
    workspaceSlug: "acme",
    type: "TIMESHEET_STATUS",
    projectName: "Client Portal Redesign",
    title: "Timesheet approved",
    body: "Your timesheet for Client Portal Redesign was approved.",
    read: true,
    metadata: { variant: "success", ctaLabel: "View submission" }
  },
  {
    recipientEmail: "admin@kloqra.dev",
    workspaceSlug: "acme",
    type: "APPROVAL_REQUEST",
    projectName: "Client Portal Redesign",
    title: "Timesheet pending approval",
    body: "Sam Rivera submitted a timesheet for Client Portal Redesign.",
    metadata: { variant: "attention", ctaLabel: "Review", href: "/approvals?tab=review" }
  },
  {
    recipientEmail: "meridian-admin@kloqra.dev",
    workspaceSlug: "meridian",
    type: "WORKSPACE_ADDED",
    title: "Welcome to Meridian Product Co",
    body: "You were added to the Meridian Product Co workspace.",
    read: true,
    metadata: { variant: "info", href: "/workspace" }
  }
];
