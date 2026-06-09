/** Rich analytics seed — 13 users, 3 workspaces, 4 projects each */

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
};

export type SeedTaskSpec = {
  name: string;
  category: SeedCategoryName;
  billableDefault: boolean;
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
    email: "admin@chronomint.dev",
    name: "Avery Admin",
    role: "ADMIN",
    defaultHourlyRate: 150,
    historyDays: 90,
    intensity: 0.95,
    preferences: { dailyTargetHours: 8, timezone: "America/New_York" }
  },
  {
    email: "ops@chronomint.dev",
    name: "Morgan Blake",
    role: "ADMIN",
    defaultHourlyRate: 140,
    historyDays: 90,
    intensity: 0.9,
    preferences: { dailyTargetHours: 7.5, timezone: "America/Chicago" }
  },
  {
    email: "member@chronomint.dev",
    name: "Sam Rivera",
    role: "MEMBER",
    defaultHourlyRate: 100,
    historyDays: 90,
    intensity: 0.92
  },
  {
    email: "alex@chronomint.dev",
    name: "Alex Chen",
    role: "MEMBER",
    defaultHourlyRate: 95,
    historyDays: 85,
    intensity: 0.88
  },
  {
    email: "jordan@chronomint.dev",
    name: "Jordan Lee",
    role: "MEMBER",
    defaultHourlyRate: 110,
    historyDays: 80,
    intensity: 0.9
  },
  {
    email: "taylor@chronomint.dev",
    name: "Taylor Brooks",
    role: "MEMBER",
    defaultHourlyRate: 88,
    historyDays: 75,
    intensity: 0.85
  },
  {
    email: "riley@chronomint.dev",
    name: "Riley Kim",
    role: "MEMBER",
    defaultHourlyRate: 105,
    historyDays: 70,
    intensity: 0.87
  },
  {
    email: "casey@chronomint.dev",
    name: "Casey Nguyen",
    role: "MEMBER",
    defaultHourlyRate: 92,
    historyDays: 65,
    intensity: 0.84
  },
  {
    email: "drew@chronomint.dev",
    name: "Drew Martinez",
    role: "MEMBER",
    defaultHourlyRate: 102,
    historyDays: 60,
    intensity: 0.82
  },
  {
    email: "sage@chronomint.dev",
    name: "Sage Patel",
    role: "MEMBER",
    defaultHourlyRate: 94,
    historyDays: 55,
    intensity: 0.8
  },
  {
    email: "blake@chronomint.dev",
    name: "Blake Wilson",
    role: "MEMBER",
    defaultHourlyRate: 108,
    historyDays: 45,
    intensity: 0.78
  },
  {
    email: "rowan@chronomint.dev",
    name: "Rowan Adams",
    role: "MEMBER",
    defaultHourlyRate: 107,
    historyDays: 35,
    intensity: 0.75
  },
  {
    email: "quinn@chronomint.dev",
    name: "Quinn Ellis",
    role: "MEMBER",
    defaultHourlyRate: 120,
    historyDays: 30,
    intensity: 0.35,
    preferences: { dailyTargetHours: 6 }
  }
];

const ADMINS = ["admin@chronomint.dev", "ops@chronomint.dev"];

function wsMembers(...members: string[]): string[] {
  return [...new Set([...ADMINS, ...members])].slice(0, 10);
}

export const SEED_WORKSPACES: SeedWorkspaceSpec[] = [
  {
    name: "Northwind Agency",
    slug: "northwind",
    settings: {
      weekStart: "monday",
      expectedWeeklyHours: 40,
      dailyTargetHours: 8,
      timezone: "America/New_York",
      exportFooterNote: "Northwind Agency — confidential billing export"
    },
    memberEmails: wsMembers(
      "member@chronomint.dev",
      "alex@chronomint.dev",
      "jordan@chronomint.dev",
      "taylor@chronomint.dev",
      "riley@chronomint.dev",
      "casey@chronomint.dev",
      "drew@chronomint.dev",
      "sage@chronomint.dev"
    ),
    projects: [
      {
        name: "Client Portal Redesign",
        color: "#6366f1",
        clientName: "Northwind Traders",
        budgetHours: 480,
        budgetBurnPct: 0.82,
        memberEmails: wsMembers(
          "member@chronomint.dev",
          "alex@chronomint.dev",
          "jordan@chronomint.dev"
        ),
        tasks: [
          { name: "UX research", category: "UI/UX Design", billableDefault: true },
          { name: "Component build", category: "Software Development", billableDefault: true },
          { name: "API integration", category: "Software Development", billableDefault: true },
          { name: "QA pass", category: "QA & Testing", billableDefault: true },
          { name: "Stakeholder review", category: "Meetings", billableDefault: true }
        ]
      },
      {
        name: "Brand Campaign Q2",
        color: "#f59e0b",
        clientName: "Fabrikam Media",
        budgetHours: 220,
        budgetBurnPct: 0.94,
        memberEmails: wsMembers(
          "taylor@chronomint.dev",
          "riley@chronomint.dev",
          "casey@chronomint.dev"
        ),
        tasks: [
          { name: "Creative direction", category: "UI/UX Design", billableDefault: true },
          { name: "Asset production", category: "UI/UX Design", billableDefault: true },
          { name: "Media buying analysis", category: "Meetings", billableDefault: true },
          { name: "Performance report", category: "Documentation", billableDefault: true }
        ]
      },
      {
        name: "Support Retainer",
        color: "#10b981",
        clientName: "Contoso Retail",
        budgetHours: 160,
        budgetBurnPct: 1.08,
        memberEmails: wsMembers(
          "drew@chronomint.dev",
          "sage@chronomint.dev",
          "blake@chronomint.dev"
        ),
        tasks: [
          { name: "Ticket triage", category: "Software Development", billableDefault: true },
          { name: "Hotfix deployment", category: "DevOps", billableDefault: true },
          { name: "SLA reporting", category: "Documentation", billableDefault: true }
        ],
        timesheetApproval: true
      },
      {
        name: "Annual Audit",
        color: "#64748b",
        clientName: "Adventure Works",
        budgetHours: 120,
        budgetBurnPct: 0.55,
        memberEmails: wsMembers(
          "member@chronomint.dev",
          "rowan@chronomint.dev",
          "quinn@chronomint.dev"
        ),
        tasks: [
          { name: "Evidence collection", category: "QA & Testing", billableDefault: true },
          { name: "Reconciliation", category: "Software Development", billableDefault: true },
          { name: "Executive summary", category: "Documentation", billableDefault: true }
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
      "member@chronomint.dev",
      "jordan@chronomint.dev",
      "riley@chronomint.dev",
      "casey@chronomint.dev",
      "drew@chronomint.dev",
      "blake@chronomint.dev",
      "rowan@chronomint.dev",
      "quinn@chronomint.dev"
    ),
    projects: [
      {
        name: "Mobile App v3",
        color: "#0ea5e9",
        clientName: null,
        budgetHours: 620,
        budgetBurnPct: 0.68,
        memberEmails: wsMembers(
          "member@chronomint.dev",
          "jordan@chronomint.dev",
          "riley@chronomint.dev"
        ),
        tasks: [
          { name: "iOS features", category: "Software Development", billableDefault: false },
          { name: "Android parity", category: "Software Development", billableDefault: false },
          { name: "Push notifications", category: "Software Development", billableDefault: false },
          { name: "Release candidate", category: "QA & Testing", billableDefault: false }
        ]
      },
      {
        name: "Platform API",
        color: "#8b5cf6",
        clientName: null,
        budgetHours: 400,
        budgetBurnPct: 0.76,
        memberEmails: wsMembers(
          "alex@chronomint.dev",
          "casey@chronomint.dev",
          "drew@chronomint.dev"
        ),
        tasks: [
          { name: "Endpoint design", category: "Software Development", billableDefault: false },
          { name: "Auth hardening", category: "Software Development", billableDefault: false },
          { name: "Rate limiting", category: "Software Development", billableDefault: false },
          { name: "OpenAPI docs", category: "Documentation", billableDefault: false }
        ]
      },
      {
        name: "Internal Tools",
        color: "#22c55e",
        clientName: null,
        budgetHours: 280,
        budgetBurnPct: 0.48,
        memberEmails: wsMembers(
          "taylor@chronomint.dev",
          "sage@chronomint.dev",
          "blake@chronomint.dev"
        ),
        tasks: [
          { name: "Admin dashboard", category: "Software Development", billableDefault: false },
          { name: "Data export jobs", category: "Software Development", billableDefault: false },
          { name: "On-call runbooks", category: "Documentation", billableDefault: false }
        ]
      },
      {
        name: "Security Hardening",
        color: "#ef4444",
        clientName: null,
        budgetHours: 200,
        budgetBurnPct: 0.91,
        memberEmails: wsMembers(
          "rowan@chronomint.dev",
          "quinn@chronomint.dev",
          "riley@chronomint.dev"
        ),
        tasks: [
          { name: "Pen test remediation", category: "QA & Testing", billableDefault: false },
          { name: "Secrets rotation", category: "DevOps", billableDefault: false },
          { name: "SOC2 evidence", category: "Documentation", billableDefault: false }
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
      exportFooterNote: "Apex Consulting — billable hours summary"
    },
    memberEmails: wsMembers(
      "member@chronomint.dev",
      "alex@chronomint.dev",
      "taylor@chronomint.dev",
      "riley@chronomint.dev",
      "casey@chronomint.dev",
      "sage@chronomint.dev",
      "blake@chronomint.dev",
      "rowan@chronomint.dev"
    ),
    projects: [
      {
        name: "ERP Migration",
        color: "#eab308",
        clientName: "Litware Inc",
        budgetHours: 720,
        budgetBurnPct: 0.61,
        memberEmails: wsMembers(
          "alex@chronomint.dev",
          "jordan@chronomint.dev",
          "casey@chronomint.dev"
        ),
        tasks: [
          { name: "Discovery workshops", category: "Meetings", billableDefault: true },
          { name: "Data mapping", category: "Software Development", billableDefault: true },
          { name: "Cutover planning", category: "DevOps", billableDefault: true },
          { name: "Hypercare support", category: "Software Development", billableDefault: true },
          { name: "Training sessions", category: "Meetings", billableDefault: true }
        ]
      },
      {
        name: "Data Warehouse",
        color: "#06b6d4",
        clientName: "Wide World Importers",
        budgetHours: 540,
        budgetBurnPct: 0.73,
        memberEmails: wsMembers(
          "riley@chronomint.dev",
          "drew@chronomint.dev",
          "sage@chronomint.dev"
        ),
        tasks: [
          { name: "Source ingestion", category: "Software Development", billableDefault: true },
          { name: "Dimensional model", category: "Software Development", billableDefault: true },
          { name: "BI dashboards", category: "UI/UX Design", billableDefault: true },
          { name: "Data quality rules", category: "QA & Testing", billableDefault: true }
        ]
      },
      {
        name: "Change Management",
        color: "#ec4899",
        clientName: "Tailspin Toys",
        budgetHours: 180,
        budgetBurnPct: 0.42,
        memberEmails: wsMembers(
          "taylor@chronomint.dev",
          "blake@chronomint.dev",
          "rowan@chronomint.dev"
        ),
        tasks: [
          { name: "Stakeholder interviews", category: "Meetings", billableDefault: true },
          { name: "Comms plan", category: "Documentation", billableDefault: true },
          { name: "Training rollout", category: "Meetings", billableDefault: false }
        ]
      },
      {
        name: "Compliance Review",
        color: "#1e3a8a",
        clientName: "Gov Sector Client",
        budgetHours: 260,
        budgetBurnPct: 0.88,
        memberEmails: wsMembers("quinn@chronomint.dev", "casey@chronomint.dev"),
        tasks: [
          { name: "Policy gap analysis", category: "QA & Testing", billableDefault: true },
          { name: "Control testing", category: "QA & Testing", billableDefault: true },
          { name: "Audit response", category: "Documentation", billableDefault: true }
        ],
        timesheetApproval: true
      }
    ]
  }
];

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
