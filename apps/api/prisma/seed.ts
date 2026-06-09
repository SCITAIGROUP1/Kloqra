import {
  PrismaClient,
  type Category,
  type Project,
  type Task,
  type User,
  type Workspace
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import {
  LOG_DESCRIPTIONS,
  SEED_PASSWORD,
  SEED_USERS,
  SEED_WORKSPACES,
  type SeedProjectSpec,
  type SeedWorkspaceSpec
} from "./seed-data";

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
const BATCH_SIZE = 1000;

type ProjectCtx = {
  project: Project;
  tasks: Task[];
  spec: SeedProjectSpec;
  workspaceId: string;
};

async function main() {
  await resetDatabase();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const users = await seedUsers(passwordHash);
  const workspaces: Workspace[] = [];
  const allProjectCtx: ProjectCtx[] = [];

  for (const wsSpec of SEED_WORKSPACES) {
    const workspace = await seedWorkspace(wsSpec, users);
    workspaces.push(workspace);
    const projectCtx = await seedProjects(workspace, wsSpec, users);
    allProjectCtx.push(...projectCtx);
    await seedHourlyRates(workspace.id, users, projectCtx);
    await seedExportPresets(workspace.id);
    const timesheetCount = await seedTimesheetPeriods(projectCtx, users, workspace.id);
    console.log(`  ${workspace.slug}: ${projectCtx.length} projects, ${timesheetCount} timesheets`);
  }

  const logCount = await seedTimeLogs(allProjectCtx, users);
  console.log(`  time logs: ${logCount} (non-overlapping per user)`);

  printCredentials();
  await printSummary(workspaces, users);
}

async function resetDatabase() {
  console.log("Resetting database…");
  await prisma.timeLogAuditEvent.deleteMany();
  await prisma.timeLog.deleteMany();
  await prisma.timesheetPeriod.deleteMany();
  await prisma.projectInvite.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.task.deleteMany();
  await prisma.hourlyRate.deleteMany();
  await prisma.exportSchedule.deleteMany();
  await prisma.exportPreset.deleteMany();
  await prisma.reportShare.deleteMany();
  await prisma.project.deleteMany();
  await prisma.category.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers(passwordHash: string): Promise<Map<string, User>> {
  const users = new Map<string, User>();
  for (const spec of SEED_USERS) {
    const user = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash,
        name: spec.name,
        defaultHourlyRate: spec.defaultHourlyRate,
        preferences: spec.preferences ?? {}
      }
    });
    users.set(spec.email, user);
  }
  return users;
}

async function seedWorkspace(
  spec: SeedWorkspaceSpec,
  users: Map<string, User>
): Promise<Workspace> {
  const workspace = await prisma.workspace.create({
    data: { name: spec.name, slug: spec.slug, settings: spec.settings }
  });

  for (const email of spec.memberEmails) {
    const user = users.get(email);
    if (!user) continue;
    const userSpec = SEED_USERS.find((u) => u.email === email)!;
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: userSpec.role
      }
    });
  }

  return workspace;
}

async function seedProjects(
  workspace: Workspace,
  wsSpec: SeedWorkspaceSpec,
  users: Map<string, User>
): Promise<ProjectCtx[]> {
  const ctx: ProjectCtx[] = [];
  const categories = await ensureWorkspaceCategories(workspace.id);
  const fallbackCategory = categories.get("Uncategorized")!;

  for (const projectSpec of wsSpec.projects) {
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: projectSpec.name,
        color: projectSpec.color,
        clientName: projectSpec.clientName,
        budgetHours: projectSpec.budgetHours,
        isActive: true,
        timesheetApprovalEnabled: projectSpec.timesheetApproval ?? false,
        timesheetApprovalPeriod: projectSpec.timesheetApproval ? "weekly" : null
      }
    });

    const team = await prisma.team.create({ data: { projectId: project.id } });

    for (const email of projectSpec.memberEmails) {
      const user = users.get(email);
      if (!user) continue;
      await prisma.teamMember.create({
        data: { teamId: team.id, userId: user.id, isActive: true }
      });
    }

    const tasks: Task[] = [];
    for (const taskSpec of projectSpec.tasks) {
      const categoryName = categoryNameForTask(taskSpec.name);
      const category = categories.get(categoryName) ?? fallbackCategory;
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          categoryId: category.id,
          taskName: taskSpec.name,
          billableDefault: taskSpec.billableDefault
        }
      });
      tasks.push(task);
    }

    ctx.push({ project, tasks, spec: projectSpec, workspaceId: workspace.id });
  }

  return ctx;
}

async function seedHourlyRates(
  workspaceId: string,
  users: Map<string, User>,
  projectCtx: ProjectCtx[]
) {
  const effectiveFrom = new Date("2025-01-01");

  for (const spec of SEED_USERS) {
    const user = users.get(spec.email);
    if (!user) continue;
    await prisma.hourlyRate.create({
      data: {
        workspaceId,
        userId: user.id,
        rate: spec.defaultHourlyRate,
        effectiveFrom
      }
    });
  }

  for (const ctx of projectCtx) {
    if (!ctx.spec.budgetHours) continue;
    const premium = Math.round(ctx.spec.budgetHours * 0.15 + 110);
    await prisma.hourlyRate.create({
      data: {
        workspaceId,
        projectId: ctx.project.id,
        rate: premium,
        effectiveFrom
      }
    });
  }
}

async function seedExportPresets(workspaceId: string) {
  const to = new Date();
  const from30 = new Date();
  from30.setUTCDate(from30.getUTCDate() - 30);
  const from90 = new Date();
  from90.setUTCDate(from90.getUTCDate() - 90);

  const presets = [
    {
      name: "Payroll CSV (30d)",
      body: {
        from: from30.toISOString(),
        to: to.toISOString(),
        billable: "all",
        reportTypes: ["time_entries", "by_member"],
        format: "csv"
      }
    },
    {
      name: "Client invoice pack",
      body: {
        from: from30.toISOString(),
        to: to.toISOString(),
        billable: "billable",
        reportTypes: ["invoice", "by_project"],
        format: "pdf"
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
          "utilization",
          "users_without_time"
        ],
        format: "xlsx"
      }
    }
  ];

  for (const preset of presets) {
    await prisma.exportPreset.create({
      data: { workspaceId, name: preset.name, body: preset.body }
    });
  }
}

function hash01(a: number, b: number, c: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 17.3) * 43758.5453;
  return x - Math.floor(x);
}

function utcDay(daysAgo: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setUTCHours(hour, minute, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

function isWeekday(daysAgo: number): boolean {
  const day = utcDay(daysAgo, 12).getUTCDay();
  return day !== 0 && day !== 6;
}

function roundQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

type LogRow = {
  userId: string;
  taskId: string;
  startTime: Date;
  endTime: Date;
  durationSec: number;
  description: string;
  isBillable: boolean;
  source: string;
};

async function flushBatch(batch: LogRow[]) {
  if (batch.length === 0) return;
  await prisma.timeLog.createMany({ data: batch });
}

async function seedTimeLogs(projectCtx: ProjectCtx[], users: Map<string, User>): Promise<number> {
  let batch: LogRow[] = [];
  let created = 0;
  const dayCursorMinutes = new Map<string, number>();

  for (const userSpec of SEED_USERS) {
    const user = users.get(userSpec.email)!;
    const userProjects = projectCtx.filter((ctx) => ctx.spec.memberEmails.includes(userSpec.email));
    if (userProjects.length === 0) continue;

    for (let daysAgo = userSpec.historyDays; daysAgo >= 0; daysAgo--) {
      const weekend = !isWeekday(daysAgo);
      if (weekend && hash01(daysAgo, 0, userSpec.email.length) > 0.2 + userSpec.intensity * 0.5) {
        continue;
      }

      const maxEntries = weekend
        ? 1 + Math.floor(2 * userSpec.intensity)
        : 2 + Math.floor(4 * userSpec.intensity);
      const entriesToday = 1 + Math.floor(maxEntries * hash01(daysAgo, 1, 2));
      const dayKey = `${user.id}:${daysAgo}`;
      let cursorMinutes =
        dayCursorMinutes.get(dayKey) ??
        7 * 60 + Math.floor(hash01(daysAgo, 2, userSpec.email.length) * 90);

      for (let e = 0; e < entriesToday; e++) {
        const ctx = userProjects[Math.floor(hash01(daysAgo, e, 3) * userProjects.length)]!;
        const task = ctx.tasks[Math.floor(hash01(daysAgo, e, 4) * ctx.tasks.length)]!;

        const billableDefault = task.billableDefault;
        const isBillable = billableDefault
          ? hash01(daysAgo, e, 5) > 0.08
          : hash01(daysAgo, e, 5) > 0.75;

        const hours = roundQuarter(0.75 + hash01(daysAgo, e, 6) * (weekend ? 2 : 3.25));
        const start = utcDay(daysAgo, Math.floor(cursorMinutes / 60), cursorMinutes % 60);
        const end = new Date(start.getTime() + hours * 3600 * 1000);
        cursorMinutes += Math.round(hours * 60) + 30;
        dayCursorMinutes.set(dayKey, cursorMinutes);
        const burnBoost = ctx.spec.budgetBurnPct && ctx.spec.budgetBurnPct > 0.85 ? 1.12 : 1;
        if (hash01(daysAgo, e, 8) > userSpec.intensity * burnBoost) continue;

        batch.push({
          userId: user.id,
          taskId: task.id,
          startTime: start,
          endTime: end,
          durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
          description: `${LOG_DESCRIPTIONS[Math.floor(hash01(daysAgo, e, 9) * LOG_DESCRIPTIONS.length)]!} — ${ctx.project.name}`,
          isBillable,
          source: daysAgo <= 2 && hash01(daysAgo, e, 10) > 0.5 ? "timer" : "manual"
        });
        created++;

        if (batch.length >= BATCH_SIZE) {
          await flushBatch(batch);
          batch = [];
        }
      }
    }
  }

  await flushBatch(batch);
  return created;
}

async function seedTimesheetPeriods(
  projectCtx: ProjectCtx[],
  users: Map<string, User>,
  workspaceId: string
): Promise<number> {
  let created = 0;
  const approvalProjects = projectCtx.filter((ctx) => ctx.spec.timesheetApproval);

  for (const ctx of approvalProjects) {
    for (const email of ctx.spec.memberEmails.slice(0, 4)) {
      const user = users.get(email);
      if (!user) continue;

      for (let weeksAgo = 1; weeksAgo <= 8; weeksAgo++) {
        const periodEnd = utcDay(weeksAgo * 7, 17);
        const periodStart = new Date(periodEnd);
        periodStart.setUTCDate(periodStart.getUTCDate() - 6);
        periodStart.setUTCHours(9, 0, 0, 0);

        const status =
          weeksAgo <= 2
            ? "APPROVED"
            : weeksAgo <= 4
              ? "SUBMITTED"
              : weeksAgo === 5
                ? "REJECTED"
                : "DRAFT";

        await prisma.timesheetPeriod.create({
          data: {
            userId: user.id,
            workspaceId,
            projectId: ctx.project.id,
            periodStart,
            periodEnd,
            status,
            submittedAt: status !== "DRAFT" ? periodEnd : null,
            reviewedAt: status === "APPROVED" || status === "REJECTED" ? periodEnd : null,
            reviewNote: status === "REJECTED" ? "Please add missing Friday entries" : null,
            reviewedBy:
              status === "APPROVED" || status === "REJECTED"
                ? users.get("admin@chronomint.dev")!.id
                : null
          }
        });
        created++;
      }
    }
  }

  return created;
}

function printCredentials() {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  SEED CREDENTIALS  (password for all accounts below)");
  console.log(`  Password: ${SEED_PASSWORD}`);
  console.log("══════════════════════════════════════════════════════════\n");

  const admins = SEED_USERS.filter((u) => u.role === "ADMIN");
  const members = SEED_USERS.filter((u) => u.role === "MEMBER");

  console.log("  Admins (2):");
  for (const u of admins) {
    console.log(`    ${u.email.padEnd(28)} ${u.name}`);
  }

  console.log("\n  Members (11):");
  for (const u of members) {
    const range = `${u.historyDays}d history · intensity ${Math.round(u.intensity * 100)}%`;
    console.log(`    ${u.email.padEnd(28)} ${u.name.padEnd(18)} (${range})`);
  }

  console.log("\n  Workspaces:");
  for (const ws of SEED_WORKSPACES) {
    console.log(
      `    ${ws.slug.padEnd(12)} ${ws.name} — ${ws.projects.length} projects, ${ws.memberEmails.length} members`
    );
  }

  console.log("\n══════════════════════════════════════════════════════════\n");
}

async function printSummary(workspaces: Workspace[], users: Map<string, User>) {
  const totals = await prisma.timeLog.aggregate({
    _count: true,
    _sum: { durationSec: true }
  });

  const byUser = await prisma.timeLog.groupBy({
    by: ["userId"],
    _count: true,
    _sum: { durationSec: true }
  });

  console.log("Seed complete:", {
    users: users.size,
    workspaces: workspaces.length,
    projects: SEED_WORKSPACES.length * 4,
    timeLogs: totals._count,
    totalHours: Math.round(((totals._sum.durationSec ?? 0) / 3600) * 100) / 100,
    perUser: byUser
      .map((row) => {
        const user = [...users.values()].find((u) => u.id === row.userId);
        return {
          email: user?.email,
          logs: row._count,
          hours: Math.round(((row._sum.durationSec ?? 0) / 3600) * 100) / 100
        };
      })
      .sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0))
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
