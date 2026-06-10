/** Rich analytics seed — 13 users, 3 workspaces, 4 projects each, category-aware logs (Kloqra demo). */

export const SEED_EMAIL_DOMAIN = "kloqra.dev";

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
};

export type SeedTaskSpec = {
  name: string;
  category: SeedCategoryName;
  billableDefault: boolean;
  /** Relative weight when picking tasks for logs (default 1) */
  weight?: number;
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
};

export type SeedWorkspaceSpec = {
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  projects: SeedProjectSpec[];
  /** Up to 10 member emails per workspace (admins always included) */
  memberEmails: string[];
};

export const SEED_PASSWORD = "password123";

/** 2 admins + 11 members = 13 accounts */
export const SEED_USERS: SeedUserSpec[] = [
  {
    email: "admin@kloqra.dev",
    name: "Avery Admin",
    role: "ADMIN",
    defaultHourlyRate: 150,
    historyDays: 90,
    intensity: 0.95,
    preferences: { dailyTargetHours: 8, timezone: "America/New_York" },
    categoryBias: { Meetings: 1.5, Documentation: 1.4, "Software Development": 0.75 }
  },
  {
    email: "ops@kloqra.dev",
    name: "Morgan Blake",
    role: "ADMIN",
    defaultHourlyRate: 140,
    historyDays: 90,
    intensity: 0.9,
    preferences: { dailyTargetHours: 7.5, timezone: "America/Chicago" },
    categoryBias: { DevOps: 1.8, Meetings: 1.3, "Software Development": 0.9 }
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
    historyDays: 85,
    intensity: 0.88,
    categoryBias: { "Software Development": 1.7, "QA & Testing": 0.9 }
  },
  {
    email: "jordan@kloqra.dev",
    name: "Jordan Lee",
    role: "MEMBER",
    defaultHourlyRate: 110,
    historyDays: 80,
    intensity: 0.9,
    categoryBias: { "Software Development": 2.0, DevOps: 0.8 }
  },
  {
    email: "taylor@kloqra.dev",
    name: "Taylor Brooks",
    role: "MEMBER",
    defaultHourlyRate: 88,
    historyDays: 75,
    intensity: 0.85,
    categoryBias: { "UI/UX Design": 2.2, Meetings: 1.1 }
  },
  {
    email: "riley@kloqra.dev",
    name: "Riley Kim",
    role: "MEMBER",
    defaultHourlyRate: 105,
    historyDays: 70,
    intensity: 0.87,
    categoryBias: { "QA & Testing": 2.1, "Software Development": 0.75 }
  },
  {
    email: "casey@kloqra.dev",
    name: "Casey Nguyen",
    role: "MEMBER",
    defaultHourlyRate: 92,
    historyDays: 65,
    intensity: 0.84,
    categoryBias: { Documentation: 1.6, "Software Development": 1.1, Meetings: 1.2 }
  },
  {
    email: "drew@kloqra.dev",
    name: "Drew Martinez",
    role: "MEMBER",
    defaultHourlyRate: 102,
    historyDays: 60,
    intensity: 0.82,
    categoryBias: { DevOps: 2.0, "Software Development": 1.0 }
  },
  {
    email: "sage@kloqra.dev",
    name: "Sage Patel",
    role: "MEMBER",
    defaultHourlyRate: 94,
    historyDays: 55,
    intensity: 0.8,
    categoryBias: { Documentation: 1.8, Meetings: 1.15 }
  },
  {
    email: "blake@kloqra.dev",
    name: "Blake Wilson",
    role: "MEMBER",
    defaultHourlyRate: 108,
    historyDays: 45,
    intensity: 0.78,
    categoryBias: { "UI/UX Design": 1.5, Meetings: 1.25, Documentation: 1.1 }
  },
  {
    email: "rowan@kloqra.dev",
    name: "Rowan Adams",
    role: "MEMBER",
    defaultHourlyRate: 107,
    historyDays: 35,
    intensity: 0.75,
    categoryBias: { "QA & Testing": 1.6, DevOps: 1.2 }
  },
  {
    email: "quinn@kloqra.dev",
    name: "Quinn Ellis",
    role: "MEMBER",
    defaultHourlyRate: 120,
    historyDays: 30,
    intensity: 0.35,
    preferences: { dailyTargetHours: 6 },
    categoryBias: { Meetings: 2.0, Documentation: 1.4 }
  }
];

const ADMINS = ["admin@kloqra.dev", "ops@kloqra.dev"];

function wsMembers(...members: string[]): string[] {
  return [...new Set([...ADMINS, ...members])].slice(0, 10);
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
    memberEmails: wsMembers(
      "member@kloqra.dev",
      "alex@kloqra.dev",
      "jordan@kloqra.dev",
      "taylor@kloqra.dev",
      "riley@kloqra.dev",
      "casey@kloqra.dev",
      "drew@kloqra.dev",
      "sage@kloqra.dev"
    ),
    projects: [
      {
        name: "Client Portal Redesign",
        color: "#236bfe",
        clientName: "Northwind Traders",
        budgetHours: 480,
        budgetBurnPct: 0.82,
        memberEmails: wsMembers("member@kloqra.dev", "alex@kloqra.dev", "jordan@kloqra.dev"),
        tasks: [
          { name: "UX research", category: "UI/UX Design", billableDefault: true, weight: 1.4 },
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
            weight: 2.2
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
          { name: "Sprint planning", category: "Meetings", billableDefault: true, weight: 1.1 },
          { name: "Stakeholder review", category: "Meetings", billableDefault: true, weight: 1.0 },
          { name: "Release notes", category: "Documentation", billableDefault: true, weight: 0.8 }
        ]
      },
      {
        name: "Brand Campaign Q2",
        color: "#f59e0b",
        clientName: "Fabrikam Media",
        budgetHours: 220,
        budgetBurnPct: 0.94,
        memberEmails: wsMembers("taylor@kloqra.dev", "riley@kloqra.dev", "casey@kloqra.dev"),
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
        memberEmails: wsMembers("drew@kloqra.dev", "sage@kloqra.dev", "blake@kloqra.dev"),
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
      },
      {
        name: "Annual Audit",
        color: "#64748b",
        clientName: "Adventure Works",
        budgetHours: 120,
        budgetBurnPct: 0.55,
        memberEmails: wsMembers("member@kloqra.dev", "rowan@kloqra.dev", "quinn@kloqra.dev"),
        tasks: [
          {
            name: "Evidence collection",
            category: "QA & Testing",
            billableDefault: true,
            weight: 1.6
          },
          { name: "Control walkthrough", category: "Meetings", billableDefault: true, weight: 1.5 },
          {
            name: "Reconciliation",
            category: "Software Development",
            billableDefault: true,
            weight: 1.0
          },
          {
            name: "Executive summary",
            category: "Documentation",
            billableDefault: true,
            weight: 1.3
          },
          { name: "Audit prep call", category: "Meetings", billableDefault: true, weight: 1.2 }
        ]
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
    memberEmails: wsMembers(
      "member@kloqra.dev",
      "jordan@kloqra.dev",
      "riley@kloqra.dev",
      "casey@kloqra.dev",
      "drew@kloqra.dev",
      "blake@kloqra.dev",
      "rowan@kloqra.dev",
      "quinn@kloqra.dev"
    ),
    projects: [
      {
        name: "Mobile App v3",
        color: "#0ea5e9",
        clientName: null,
        budgetHours: 620,
        budgetBurnPct: 0.68,
        memberEmails: wsMembers("member@kloqra.dev", "jordan@kloqra.dev", "riley@kloqra.dev"),
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
        memberEmails: wsMembers("alex@kloqra.dev", "casey@kloqra.dev", "drew@kloqra.dev"),
        tasks: [
          {
            name: "Endpoint design",
            category: "Software Development",
            billableDefault: false,
            weight: 1.8
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
          { name: "OpenAPI docs", category: "Documentation", billableDefault: false, weight: 1.5 },
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
        name: "Internal Tools",
        color: "#22c55e",
        clientName: null,
        budgetHours: 280,
        budgetBurnPct: 0.48,
        memberEmails: wsMembers("taylor@kloqra.dev", "sage@kloqra.dev", "blake@kloqra.dev"),
        tasks: [
          {
            name: "Admin dashboard",
            category: "Software Development",
            billableDefault: false,
            weight: 1.7
          },
          {
            name: "Data export jobs",
            category: "Software Development",
            billableDefault: false,
            weight: 1.5
          },
          {
            name: "Widget wireframes",
            category: "UI/UX Design",
            billableDefault: false,
            weight: 1.3
          },
          {
            name: "On-call runbooks",
            category: "Documentation",
            billableDefault: false,
            weight: 1.6
          },
          { name: "Team sync", category: "Meetings", billableDefault: false, weight: 1.1 },
          {
            name: "Export smoke tests",
            category: "QA & Testing",
            billableDefault: false,
            weight: 0.9
          }
        ]
      },
      {
        name: "Security Hardening",
        color: "#ef4444",
        clientName: null,
        budgetHours: 200,
        budgetBurnPct: 0.91,
        memberEmails: wsMembers("rowan@kloqra.dev", "quinn@kloqra.dev", "riley@kloqra.dev"),
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
  },
  {
    name: "Apex Consulting",
    slug: "apex",
    settings: {
      weekStart: "monday",
      expectedWeeklyHours: 40,
      dailyTargetHours: 7.5,
      timezone: "Europe/London",
      exportFooterNote: "Apex Consulting — Kloqra billable hours summary"
    },
    memberEmails: wsMembers(
      "member@kloqra.dev",
      "alex@kloqra.dev",
      "taylor@kloqra.dev",
      "riley@kloqra.dev",
      "casey@kloqra.dev",
      "sage@kloqra.dev",
      "blake@kloqra.dev",
      "rowan@kloqra.dev"
    ),
    projects: [
      {
        name: "ERP Migration",
        color: "#eab308",
        clientName: "Litware Inc",
        budgetHours: 720,
        budgetBurnPct: 0.61,
        memberEmails: wsMembers(
          "member@kloqra.dev",
          "alex@kloqra.dev",
          "jordan@kloqra.dev",
          "casey@kloqra.dev"
        ),
        tasks: [
          { name: "Discovery workshops", category: "Meetings", billableDefault: true, weight: 2.0 },
          { name: "Steering committee", category: "Meetings", billableDefault: true, weight: 1.5 },
          {
            name: "Data mapping",
            category: "Software Development",
            billableDefault: true,
            weight: 1.8
          },
          {
            name: "ETL scripts",
            category: "Software Development",
            billableDefault: true,
            weight: 1.6
          },
          { name: "Cutover planning", category: "DevOps", billableDefault: true, weight: 1.4 },
          {
            name: "Hypercare support",
            category: "Software Development",
            billableDefault: true,
            weight: 1.2
          },
          { name: "Training sessions", category: "Meetings", billableDefault: true, weight: 1.3 },
          {
            name: "Migration runbook",
            category: "Documentation",
            billableDefault: true,
            weight: 1.1
          },
          { name: "UAT sign-off", category: "QA & Testing", billableDefault: true, weight: 1.0 }
        ]
      },
      {
        name: "Data Warehouse",
        color: "#06b6d4",
        clientName: "Wide World Importers",
        budgetHours: 540,
        budgetBurnPct: 0.73,
        memberEmails: wsMembers("riley@kloqra.dev", "drew@kloqra.dev", "sage@kloqra.dev"),
        tasks: [
          {
            name: "Source ingestion",
            category: "Software Development",
            billableDefault: true,
            weight: 2.0
          },
          {
            name: "Dimensional model",
            category: "Software Development",
            billableDefault: true,
            weight: 1.7
          },
          { name: "BI dashboards", category: "UI/UX Design", billableDefault: true, weight: 1.5 },
          {
            name: "Data quality rules",
            category: "QA & Testing",
            billableDefault: true,
            weight: 1.6
          },
          { name: "Pipeline monitoring", category: "DevOps", billableDefault: true, weight: 1.2 },
          { name: "Stakeholder demo", category: "Meetings", billableDefault: true, weight: 1.1 },
          { name: "Data dictionary", category: "Documentation", billableDefault: true, weight: 1.0 }
        ]
      },
      {
        name: "Change Management",
        color: "#ec4899",
        clientName: "Tailspin Toys",
        budgetHours: 180,
        budgetBurnPct: 0.42,
        memberEmails: wsMembers("taylor@kloqra.dev", "blake@kloqra.dev", "rowan@kloqra.dev"),
        tasks: [
          {
            name: "Stakeholder interviews",
            category: "Meetings",
            billableDefault: true,
            weight: 2.2
          },
          {
            name: "Workshop facilitation",
            category: "Meetings",
            billableDefault: true,
            weight: 1.8
          },
          { name: "Comms plan", category: "Documentation", billableDefault: true, weight: 1.5 },
          { name: "Change assets", category: "UI/UX Design", billableDefault: true, weight: 1.2 },
          { name: "Training rollout", category: "Meetings", billableDefault: false, weight: 1.4 },
          { name: "Feedback survey", category: "QA & Testing", billableDefault: true, weight: 0.8 }
        ]
      },
      {
        name: "Compliance Review",
        color: "#1e3a8a",
        clientName: "Gov Sector Client",
        budgetHours: 260,
        budgetBurnPct: 0.88,
        memberEmails: wsMembers("quinn@kloqra.dev", "casey@kloqra.dev"),
        tasks: [
          {
            name: "Policy gap analysis",
            category: "QA & Testing",
            billableDefault: true,
            weight: 1.7
          },
          { name: "Control testing", category: "QA & Testing", billableDefault: true, weight: 1.8 },
          { name: "Regulator briefing", category: "Meetings", billableDefault: true, weight: 1.5 },
          { name: "Audit response", category: "Documentation", billableDefault: true, weight: 1.4 },
          {
            name: "Evidence packaging",
            category: "Documentation",
            billableDefault: true,
            weight: 1.2
          },
          {
            name: "Access review scripts",
            category: "Software Development",
            billableDefault: true,
            weight: 0.9
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
