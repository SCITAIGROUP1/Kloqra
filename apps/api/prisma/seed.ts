import {
  PrismaClient,
  type Category,
  type Project,
  type Task,
  type Team,
  type User,
  type Workspace
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ALL_PROJECTS, ALL_USERS, SPARSE_LOG_EMAILS, type SeedProjectSpec } from "./seed-data";

const CATEGORY_SEEDS: { name: string; description: string }[] = [
  { name: "Software Development", description: "Engineering, coding, and code review work" },
  { name: "UI/UX Design", description: "Design, branding, and design-system work" },
  { name: "Meetings", description: "Planning, kickoffs, syncs, and stakeholder calls" },
  { name: "QA & Testing", description: "Test design, regression, and quality assurance" },
  { name: "DevOps", description: "Infrastructure, CI/CD, and platform engineering" },
  { name: "Documentation", description: "User guides, API references, and runbooks" },
  { name: "Uncategorized", description: "Default bucket for unclassified tasks" }
];

function categoryNameForTask(taskName: string): string {
  const n = taskName.toLowerCase();
  if (/design|brand|figma|token|storybook|component library|asset|creative|template/.test(n)) {
    return "UI/UX Design";
  }
  if (
    /sprint planning|planning|kickoff|workshop|sync|stakeholder|readout|training|standup|grooming/.test(
      n
    )
  ) {
    return "Meetings";
  }
  if (/qa|testing|regression|audit|pen test|crash analytics|uat/.test(n)) {
    return "QA & Testing";
  }
  if (
    /ci\/cd|k8s|infra|infrastructure|cost optimization|dr drill|pipeline|cutover|deployment|hypercare/.test(
      n
    )
  ) {
    return "DevOps";
  }
  if (/docs|documentation|reference|release notes|knowledge base|runbook|tutorial/.test(n)) {
    return "Documentation";
  }
  return "Software Development";
}

async function ensureWorkspaceCategories(workspaceId: string): Promise<Map<string, Category>> {
  const out = new Map<string, Category>();
  for (const spec of CATEGORY_SEEDS) {
    const category = await prisma.category.upsert({
      where: { workspaceId_name: { workspaceId, name: spec.name } },
      update: { description: spec.description },
      create: { workspaceId, name: spec.name, description: spec.description }
    });
    out.set(spec.name, category);
  }
  return out;
}

const prisma = new PrismaClient();

const PASSWORD = "password123";
/** Weeks of history for dashboards, exports, and utilization reports */
const HISTORY_WEEKS = 52;
const BATCH_SIZE = 1000;

type SeedProject = SeedProjectSpec;

const ACME_AGENCY_MEMBERS = new Set([
  "admin@chronomint.dev",
  "member@chronomint.dev",
  "contractor@chronomint.dev",
  "alex@chronomint.dev",
  "jordan@chronomint.dev",
  "taylor@chronomint.dev",
  "drew@chronomint.dev"
]);

const DEMO_USERS = ALL_USERS;
const DEMO_PROJECTS = ALL_PROJECTS;

const DESCRIPTIONS = [
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

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = new Map<string, User>();

  for (const spec of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: { name: spec.name, defaultHourlyRate: spec.defaultHourlyRate },
      create: {
        email: spec.email,
        passwordHash,
        name: spec.name,
        defaultHourlyRate: spec.defaultHourlyRate
      }
    });
    users.set(spec.email, user);
  }

  const admin = users.get("admin@chronomint.dev")!;
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: {
      name: "Demo Workspace",
      settings: {
        weekStart: "monday",
        expectedWeeklyHours: 40,
        exportFooterNote: "Demo export — not for billing. Questions: billing@chronomint.dev"
      }
    },
    create: {
      name: "Demo Workspace",
      slug: "demo",
      settings: {
        weekStart: "monday",
        expectedWeeklyHours: 40,
        exportFooterNote: "Demo export — not for billing. Questions: billing@chronomint.dev"
      }
    }
  });

  const workspaceAcme = await prisma.workspace.upsert({
    where: { slug: "acme-agency" },
    update: { name: "Acme Agency" },
    create: { name: "Acme Agency", slug: "acme-agency" }
  });

  for (const spec of DEMO_USERS) {
    const user = users.get(spec.email)!;
    for (const ws of [workspace, workspaceAcme]) {
      if (ws.id === workspaceAcme.id && !ACME_AGENCY_MEMBERS.has(spec.email)) continue;
      const role =
        ws.id === workspaceAcme.id && spec.email === "contractor@chronomint.dev"
          ? "MEMBER"
          : spec.role;
      await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: ws.id, userId: user.id } },
        update: { role },
        create: { workspaceId: ws.id, userId: user.id, role }
      });
    }
  }

  const demoCategories = await ensureWorkspaceCategories(workspace.id);
  await ensureWorkspaceCategories(workspaceAcme.id);

  const projectCtx: { project: Project; tasks: Task[]; team: Team; spec: SeedProject }[] = [];

  for (const spec of DEMO_PROJECTS) {
    const ctx = await ensureProjectWithTeam(workspace, spec, users, demoCategories);
    projectCtx.push({ ...ctx, spec });
  }

  await seedHourlyRates(workspace.id, users);
  await seedExportPresets(workspace.id);
  await seedSampleInvites(projectCtx, admin);

  await prisma.timeLog.deleteMany({
    where: { task: { project: { workspaceId: workspace.id } } }
  });

  const logCount = await seedTimeLogsBulk(projectCtx, users);
  const adminWeekLogs = await seedAdminCurrentWeek(projectCtx, users.get("admin@chronomint.dev")!);
  const acmeLogs = await seedAcmeAgencyRich(workspaceAcme, users);

  const totals = await prisma.timeLog.aggregate({
    where: { task: { project: { workspaceId: workspace.id } } },
    _count: true,
    _sum: { durationSec: true }
  });

  console.log("Seed complete:", {
    workspace: workspace.slug,
    historyWeeks: HISTORY_WEEKS,
    users: ALL_USERS.length,
    projects: ALL_PROJECTS.length,
    sparseLogUsers: [...SPARSE_LOG_EMAILS],
    demoTimeLogs: totals._count,
    demoTotalHours: round2((totals._sum.durationSec ?? 0) / 3600),
    bulkInserted: logCount,
    adminCurrentWeekLogs: adminWeekLogs,
    acmeAgencyTimeLogs: acmeLogs,
    logins: {
      admin: "admin@chronomint.dev",
      ops: "ops@chronomint.dev",
      member: "member@chronomint.dev",
      sparseUsers: [...SPARSE_LOG_EMAILS].join(", ")
    },
    password: PASSWORD,
    exportHint: `Use ${workspace.slug} workspace; try 7/30/90d and ${HISTORY_WEEKS}-week exports`
  });
}

async function seedExportPresets(workspaceId: string) {
  const to = new Date();
  const from30 = new Date();
  from30.setUTCDate(from30.getUTCDate() - 30);
  const from90 = new Date();
  from90.setUTCDate(from90.getUTCDate() - 90);

  const presets = [
    {
      name: "Payroll CSV",
      body: {
        from: from30.toISOString(),
        to: to.toISOString(),
        billable: "all",
        reportTypes: ["time_entries", "by_member"],
        format: "csv",
        columns: {
          time_entries: [
            "date",
            "member",
            "email",
            "project",
            "task",
            "hours",
            "billable",
            "rate",
            "amount"
          ],
          by_member: ["member", "email", "total_hours", "billable_hours", "billable_amount"]
        }
      }
    },
    {
      name: "Client invoice pack",
      body: {
        from: from30.toISOString(),
        to: to.toISOString(),
        billable: "billable",
        reportTypes: ["invoice", "by_project"],
        format: "pdf",
        columns: {
          invoice: ["client", "project", "task", "date", "hours", "rate", "amount", "description"],
          by_project: ["project", "client", "billable_hours", "billable_amount"]
        }
      }
    },
    {
      name: "Ops weekly",
      body: {
        from: from30.toISOString(),
        to: to.toISOString(),
        billable: "all",
        reportTypes: ["weekly_summary", "utilization", "users_without_time"],
        format: "xlsx"
      }
    },
    {
      name: "Full analytics (90d)",
      body: {
        from: from90.toISOString(),
        to: to.toISOString(),
        billable: "all",
        reportTypes: [
          "time_entries",
          "daily_summary",
          "weekly_summary",
          "by_project",
          "by_member",
          "by_task",
          "budget_vs_actual",
          "utilization"
        ],
        format: "xlsx"
      }
    },
    {
      name: "Budget & gaps",
      body: {
        from: from90.toISOString(),
        to: to.toISOString(),
        billable: "all",
        reportTypes: ["budget_vs_actual", "users_without_time", "by_project"],
        format: "csv"
      }
    },
    {
      name: "Task rollup",
      body: {
        from: from30.toISOString(),
        to: to.toISOString(),
        billable: "all",
        reportTypes: ["by_task", "daily_summary"],
        format: "xlsx"
      }
    }
  ];

  for (const p of presets) {
    await prisma.exportPreset.upsert({
      where: { workspaceId_name: { workspaceId, name: p.name } },
      update: { body: p.body },
      create: { workspaceId, name: p.name, body: p.body }
    });
  }
}

async function seedSampleInvites(projectCtx: { project: Project; team: Team }[], admin: User) {
  const acme = projectCtx.find((c) => c.project.name === "Acme Website");
  if (!acme) return;

  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + 14);

  await prisma.projectInvite.upsert({
    where: { token: "seed-invite-acme-freelancer" },
    update: { expiresAt: expires },
    create: {
      projectId: acme.project.id,
      token: "seed-invite-acme-freelancer",
      email: "freelance@example.com",
      expiresAt: expires,
      createdById: admin.id
    }
  });
}

async function seedHourlyRates(workspaceId: string, users: Map<string, User>) {
  const projects = await prisma.project.findMany({ where: { workspaceId } });
  const projectByName = new Map(projects.map((p) => [p.name, p.id]));

  const rates: {
    userEmail?: string;
    projectName?: string;
    rate: number;
    effectiveFrom: string;
  }[] = [
    { userEmail: "member@chronomint.dev", rate: 100, effectiveFrom: "2025-01-01" },
    { userEmail: "alex@chronomint.dev", rate: 95, effectiveFrom: "2025-01-01" },
    { userEmail: "jordan@chronomint.dev", rate: 110, effectiveFrom: "2025-01-01" },
    { userEmail: "taylor@chronomint.dev", rate: 88, effectiveFrom: "2025-03-01" },
    { userEmail: "riley@chronomint.dev", rate: 105, effectiveFrom: "2025-03-01" },
    { userEmail: "casey@chronomint.dev", rate: 92, effectiveFrom: "2025-04-01" },
    { userEmail: "contractor@chronomint.dev", rate: 135, effectiveFrom: "2025-05-01" },
    { userEmail: "drew@chronomint.dev", rate: 102, effectiveFrom: "2025-06-01" },
    { userEmail: "sage@chronomint.dev", rate: 94, effectiveFrom: "2025-06-01" },
    { userEmail: "blake@chronomint.dev", rate: 108, effectiveFrom: "2025-07-01" },
    { userEmail: "rowan@chronomint.dev", rate: 107, effectiveFrom: "2025-08-01" },
    { projectName: "Acme Website", rate: 125, effectiveFrom: "2025-06-01" },
    { projectName: "Beta Mobile App", rate: 115, effectiveFrom: "2025-06-01" },
    { projectName: "Gamma Rebrand", rate: 130, effectiveFrom: "2025-07-01" },
    { projectName: "Delta Support", rate: 140, effectiveFrom: "2025-08-01" },
    { projectName: "Zeta Data Pipeline", rate: 118, effectiveFrom: "2025-09-01" },
    { projectName: "Horizon Payroll", rate: 112, effectiveFrom: "2025-10-01" },
    { projectName: "Nova Subscription Billing", rate: 128, effectiveFrom: "2025-11-01" },
    { projectName: "Phi Healthcare Portal", rate: 122, effectiveFrom: "2025-11-01" },
    { projectName: "Omega Gov Contract", rate: 145, effectiveFrom: "2025-12-01" },
    { projectName: "Sigma AI Assistant", rate: 132, effectiveFrom: "2026-01-01" }
  ];

  for (const row of rates) {
    const userId = row.userEmail ? (users.get(row.userEmail)?.id ?? null) : null;
    const projectId = row.projectName ? (projectByName.get(row.projectName) ?? null) : null;
    const effectiveFrom = new Date(row.effectiveFrom);

    const existing = await prisma.hourlyRate.findFirst({
      where: { workspaceId, userId, projectId, effectiveFrom }
    });
    if (existing) continue;

    await prisma.hourlyRate.create({
      data: { workspaceId, userId, projectId, rate: row.rate, effectiveFrom }
    });
  }
}

async function ensureProjectWithTeam(
  workspace: Workspace,
  spec: SeedProject,
  users: Map<string, User>,
  categories: Map<string, Category>
) {
  const existing = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: spec.name }
  });

  const project = existing
    ? await prisma.project.update({
        where: { id: existing.id },
        data: {
          color: spec.color,
          clientName: spec.clientName,
          budgetHours: spec.budgetHours,
          isActive: true
        }
      })
    : await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          name: spec.name,
          color: spec.color,
          clientName: spec.clientName,
          budgetHours: spec.budgetHours,
          isActive: true
        }
      });

  const team =
    (await prisma.team.findUnique({ where: { projectId: project.id } })) ??
    (await prisma.team.create({ data: { projectId: project.id } }));

  for (const email of spec.memberEmails) {
    const user = users.get(email);
    if (!user) continue;
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
      update: { isActive: true },
      create: { teamId: team.id, userId: user.id, isActive: true }
    });
  }

  const fallbackCategory = categories.get("Uncategorized")!;

  const tasks: Task[] = [];
  for (const taskSpec of spec.tasks) {
    const categoryName = categoryNameForTask(taskSpec.name);
    const category = categories.get(categoryName) ?? fallbackCategory;
    let task = await prisma.task.findFirst({
      where: { projectId: project.id, taskName: taskSpec.name }
    });
    if (!task) {
      task = await prisma.task.create({
        data: {
          projectId: project.id,
          categoryId: category.id,
          taskName: taskSpec.name,
          billableDefault: taskSpec.billableDefault
        }
      });
    } else if (
      task.billableDefault !== taskSpec.billableDefault ||
      task.categoryId !== category.id
    ) {
      task = await prisma.task.update({
        where: { id: task.id },
        data: {
          billableDefault: taskSpec.billableDefault,
          categoryId: category.id
        }
      });
    }
    tasks.push(task);
  }

  return { project, tasks, team };
}

function hash01(dayIndex: number, slot: number, salt: number): number {
  const x = Math.sin(dayIndex * 127.1 + slot * 311.7 + salt * 17.3) * 43758.5453;
  return x - Math.floor(x);
}

function utcWorkday(daysAgo: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setUTCHours(hour, minute, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

function isWeekday(daysAgo: number): boolean {
  const d = utcWorkday(daysAgo, 12);
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

function roundQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type Assignment = {
  projectIndex: number;
  taskIndex: number;
  userEmail: string;
  weight: number;
};

function buildAssignments(projectCtx: { spec: SeedProject }[]): Assignment[] {
  const out: Assignment[] = [];
  projectCtx.forEach((ctx, projectIndex) => {
    ctx.spec.tasks.forEach((_, taskIndex) => {
      for (const email of ctx.spec.memberEmails) {
        if (SPARSE_LOG_EMAILS.has(email)) continue;
        const base = email === "contractor@chronomint.dev" ? 1.5 : 2;
        const burnBoost = ctx.spec.budgetBurnPct && ctx.spec.budgetBurnPct > 0.85 ? 1.4 : 1;
        out.push({
          projectIndex,
          taskIndex,
          userEmail: email,
          weight: base * burnBoost * (1 + hash01(projectIndex, taskIndex, email.length) * 2)
        });
      }
    });
  });
  return out;
}

function pickWeighted<T extends { weight: number }>(items: T[], r: number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let acc = 0;
  const target = r * total;
  for (const item of items) {
    acc += item.weight;
    if (target <= acc) return item;
  }
  return items[items.length - 1]!;
}

async function flushBatch(
  batch: {
    userId: string;
    taskId: string;
    startTime: Date;
    endTime: Date;
    durationSec: number;
    description: string;
    isBillable: boolean;
    source: string;
  }[]
) {
  if (batch.length === 0) return;
  await prisma.timeLog.createMany({ data: batch });
}

async function seedTimeLogsBulk(
  projectCtx: { project: Project; tasks: Task[]; spec: SeedProject }[],
  users: Map<string, User>
): Promise<number> {
  const assignments = buildAssignments(projectCtx);
  const totalDays = HISTORY_WEEKS * 7;
  let batch: Parameters<typeof flushBatch>[0] = [];
  let created = 0;

  for (let daysAgo = totalDays; daysAgo >= 0; daysAgo--) {
    const recent = daysAgo <= 35;
    const mid = daysAgo > 35 && daysAgo <= 120;
    const isWeekend = !isWeekday(daysAgo);

    if (!recent && !mid && isWeekend) continue;
    if (recent && isWeekend && hash01(daysAgo, 0, 9) > 0.55) continue;
    if (mid && isWeekend && hash01(daysAgo, 0, 9) > 0.75) continue;

    const entriesToday = recent
      ? isWeekend
        ? 8 + Math.floor(hash01(daysAgo, 0, 1) * 10)
        : 22 + Math.floor(hash01(daysAgo, 0, 1) * 18)
      : mid
        ? isWeekend
          ? 3 + Math.floor(hash01(daysAgo, 0, 1) * 4)
          : 12 + Math.floor(hash01(daysAgo, 0, 1) * 10)
        : isWeekend
          ? 1 + Math.floor(hash01(daysAgo, 0, 1) * 2)
          : 5 + Math.floor(hash01(daysAgo, 0, 1) * 6);

    for (let e = 0; e < entriesToday; e++) {
      const pick = pickWeighted(assignments, hash01(daysAgo, e, 2));
      const ctx = projectCtx[pick.projectIndex];
      if (!ctx) continue;
      const task = ctx.tasks[pick.taskIndex];
      const user = users.get(pick.userEmail);
      if (!task || !user) continue;

      const billableDefault = task.billableDefault;
      const isBillable = billableDefault
        ? hash01(daysAgo, e, 3) > 0.1
        : hash01(daysAgo, e, 3) > 0.82;

      const hours = roundQuarter(0.75 + hash01(daysAgo, e, 4) * 7.25);
      const startHour = 7 + Math.floor(hash01(daysAgo, e, 5) * 10);
      const start = utcWorkday(daysAgo, startHour, (e * 17) % 60);
      const end = new Date(start.getTime() + hours * 3600 * 1000);
      const source = hash01(daysAgo, e, 6) > 0.38 ? "timer" : "manual";
      const description = DESCRIPTIONS[Math.floor(hash01(daysAgo, e, 7) * DESCRIPTIONS.length)]!;

      batch.push({
        userId: user.id,
        taskId: task.id,
        startTime: start,
        endTime: end,
        durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
        description: `${description} — ${ctx.project.name}`,
        isBillable,
        source
      });
      created++;

      if (batch.length >= BATCH_SIZE) {
        await flushBatch(batch);
        batch = [];
      }
    }
  }

  const kappa = projectCtx.find((c) => c.project.name === "Kappa Onboarding");
  const kappaTask = kappa?.tasks[0];
  for (const email of SPARSE_LOG_EMAILS) {
    const sparse = users.get(email);
    if (!sparse || !kappaTask) continue;
    const offsets =
      email === "onboarding@chronomint.dev"
        ? [45, 72]
        : email === "newhire@chronomint.dev"
          ? [18]
          : [];
    for (const daysAgo of offsets) {
      const start = utcWorkday(daysAgo, 10);
      const end = new Date(start.getTime() + 1.25 * 3600 * 1000);
      batch.push({
        userId: sparse.id,
        taskId: kappaTask.id,
        startTime: start,
        endTime: end,
        durationSec: 4500,
        description: `Sparse log — ${email.split("@")[0]}`,
        isBillable: true,
        source: "manual"
      });
      created++;
    }
  }

  await flushBatch(batch);
  return created;
}

async function seedAdminCurrentWeek(
  projectCtx: { project: Project; tasks: Task[] }[],
  admin: User
): Promise<number> {
  const plan: {
    daysAgo: number;
    projectIndex: number;
    taskIndex: number;
    hour: number;
    hours: number;
    billable: boolean;
  }[] = [
    { daysAgo: 0, projectIndex: 0, taskIndex: 0, hour: 9, hours: 2.5, billable: true },
    { daysAgo: 0, projectIndex: 2, taskIndex: 0, hour: 14, hours: 1.5, billable: false },
    { daysAgo: 0, projectIndex: 3, taskIndex: 1, hour: 16, hours: 1, billable: true },
    { daysAgo: 1, projectIndex: 1, taskIndex: 0, hour: 10, hours: 3.5, billable: true },
    { daysAgo: 1, projectIndex: 3, taskIndex: 1, hour: 15, hours: 2, billable: true },
    { daysAgo: 2, projectIndex: 0, taskIndex: 1, hour: 9, hours: 2.5, billable: true },
    { daysAgo: 2, projectIndex: 4, taskIndex: 0, hour: 13, hours: 1.5, billable: true },
    { daysAgo: 3, projectIndex: 5, taskIndex: 0, hour: 11, hours: 2, billable: true },
    { daysAgo: 3, projectIndex: 2, taskIndex: 1, hour: 16, hours: 1, billable: false },
    { daysAgo: 4, projectIndex: 6, taskIndex: 0, hour: 10, hours: 3, billable: true },
    { daysAgo: 4, projectIndex: 1, taskIndex: 2, hour: 14, hours: 1.5, billable: true },
    { daysAgo: 5, projectIndex: 0, taskIndex: 2, hour: 9, hours: 2, billable: true },
    { daysAgo: 5, projectIndex: 8, taskIndex: 1, hour: 11, hours: 2, billable: true },
    { daysAgo: 6, projectIndex: 4, taskIndex: 1, hour: 11, hours: 1.5, billable: true }
  ];

  let created = 0;
  for (const row of plan) {
    const ctx = projectCtx[row.projectIndex];
    if (!ctx) continue;
    const task = ctx.tasks[row.taskIndex];
    if (!task) continue;
    const start = utcWorkday(row.daysAgo, row.hour);
    const end = new Date(start.getTime() + row.hours * 3600 * 1000);
    await prisma.timeLog.create({
      data: {
        userId: admin.id,
        taskId: task.id,
        startTime: start,
        endTime: end,
        durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
        description: `${DESCRIPTIONS[created % DESCRIPTIONS.length]} — ${ctx.project.name}`,
        isBillable: row.billable,
        source: row.daysAgo === 0 ? "timer" : "manual"
      }
    });
    created++;
  }
  return created;
}

async function seedAcmeAgencyRich(workspace: Workspace, users: Map<string, User>): Promise<number> {
  const member = users.get("member@chronomint.dev")!;
  const contractor = users.get("contractor@chronomint.dev")!;
  const categories = await ensureWorkspaceCategories(workspace.id);
  const fallbackCategory = categories.get("Uncategorized")!;

  const projects = [
    {
      name: "Retainer Q2",
      color: "#14b8a6",
      clientName: "Northwind",
      budgetHours: 240,
      tasks: ["Monthly reporting", "Stakeholder deck", "Metrics review", "Forecast model"]
    },
    {
      name: "Campaign Sprint",
      color: "#f97316",
      clientName: "Fabrikam",
      budgetHours: 160,
      tasks: ["Landing pages", "A/B analysis", "Creative QA"]
    },
    {
      name: "Support Overflow",
      color: "#84cc16",
      clientName: "Contoso",
      budgetHours: 100,
      tasks: ["Ticket backlog", "Escalations"]
    },
    {
      name: "Year-end Audit",
      color: "#57534e",
      clientName: "Adventure Works",
      budgetHours: 80,
      tasks: ["Evidence pack", "Reconciliation"]
    }
  ];

  await prisma.timeLog.deleteMany({
    where: { task: { project: { workspaceId: workspace.id } } }
  });

  let created = 0;

  for (const pSpec of projects) {
    let project = await prisma.project.findFirst({
      where: { workspaceId: workspace.id, name: pSpec.name }
    });
    project =
      project ??
      (await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          name: pSpec.name,
          color: pSpec.color,
          clientName: pSpec.clientName,
          budgetHours: pSpec.budgetHours,
          isActive: true
        }
      }));

    const team =
      (await prisma.team.findUnique({ where: { projectId: project.id } })) ??
      (await prisma.team.create({ data: { projectId: project.id } }));

    for (const email of ACME_AGENCY_MEMBERS) {
      const user = users.get(email);
      if (!user) continue;
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId: user.id } },
        update: { isActive: true },
        create: { teamId: team.id, userId: user.id, isActive: true }
      });
    }

    const tasks: Task[] = [];
    for (const taskName of pSpec.tasks) {
      const categoryName = categoryNameForTask(taskName);
      const category = categories.get(categoryName) ?? fallbackCategory;
      let task = await prisma.task.findFirst({
        where: { projectId: project.id, taskName }
      });
      if (!task) {
        task = await prisma.task.create({
          data: {
            projectId: project.id,
            categoryId: category.id,
            taskName,
            billableDefault: true
          }
        });
      } else if (task.categoryId !== category.id) {
        task = await prisma.task.update({
          where: { id: task.id },
          data: { categoryId: category.id }
        });
      }
      tasks.push(task);
    }

    const actors = [
      member,
      contractor,
      users.get("alex@chronomint.dev")!,
      users.get("drew@chronomint.dev")!
    ];

    for (let weeksAgo = 0; weeksAgo < 24; weeksAgo++) {
      for (let day = 0; day < 3; day++) {
        const daysAgo = weeksAgo * 7 + day + 1;
        for (let t = 0; t < tasks.length; t++) {
          const task = tasks[t]!;
          const actor = actors[(weeksAgo + t + day) % actors.length]!;
          const hours = 1.5 + hash01(weeksAgo, t + day, pSpec.name.length) * 5;
          const start = utcWorkday(daysAgo, 8 + t + day, 15);
          const end = new Date(start.getTime() + hours * 3600 * 1000);
          await prisma.timeLog.create({
            data: {
              userId: actor.id,
              taskId: task.id,
              startTime: start,
              endTime: end,
              durationSec: Math.floor(hours * 3600),
              description: `${pSpec.name} — ${task.taskName}`,
              isBillable: true,
              source: weeksAgo === 0 && day === 0 ? "timer" : "manual"
            }
          });
          created++;
        }
      }
    }
  }

  return created;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
