import {
  Prisma,
  PrismaClient,
  type Project,
  type Task,
  type User,
  type Workspace
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import {
  CATEGORY_LOG_DESCRIPTIONS,
  DAY_CATEGORY_BOOST,
  LOG_DESCRIPTIONS,
  SEED_CATEGORIES,
  SEED_PASSWORD,
  SEED_USERS,
  SEED_WORKSPACES,
  type SeedCategoryName,
  type SeedProjectSpec,
  type SeedTaskSpec,
  type SeedUserSpec,
  type SeedWorkspaceSpec
} from "./seed-data";

type SeedCategory = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CategoryWithCount = SeedCategory & { _count: { tasks: number } };

const prisma = new PrismaClient();

/** Category delegate — typed at boundary for stale IDE Prisma clients (run `prisma generate`). */
function categoryRepo() {
  return (
    prisma as unknown as {
      category: {
        upsert: (args: {
          where: { workspaceId_name: { workspaceId: string; name: string } };
          update: { description: string };
          create: { workspaceId: string; name: string; description: string };
        }) => Promise<SeedCategory>;
        findMany: (args: {
          where?: { workspaceId: string };
          include?: { _count: { select: { tasks: true } } };
          orderBy?: { name: "asc" };
        }) => Promise<CategoryWithCount[]>;
        deleteMany: () => Promise<{ count: number }>;
      };
    }
  ).category;
}

async function ensureWorkspaceCategories(workspaceId: string): Promise<Map<string, SeedCategory>> {
  const out = new Map<string, SeedCategory>();
  for (const spec of SEED_CATEGORIES) {
    const category = await categoryRepo().upsert({
      where: { workspaceId_name: { workspaceId, name: spec.name } },
      update: { description: spec.description },
      create: { workspaceId, name: spec.name, description: spec.description }
    });
    out.set(spec.name, category);
  }
  return out;
}
const BATCH_SIZE = 1000;

type TaskWithMeta = {
  task: Task;
  spec: SeedTaskSpec;
};

type ProjectCtx = {
  project: Project;
  tasks: TaskWithMeta[];
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
    await seedSampleInvite(projectCtx, users.get("admin@kloqra.dev")!);
    const timesheetCount = await seedTimesheetPeriods(projectCtx, users, workspace.id);
    const categorySummary = await categoryTaskCounts(workspace.id);
    console.log(
      `  ${workspace.slug}: ${projectCtx.length} projects, ${timesheetCount} timesheets, categories: ${categorySummary}`
    );
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
  await categoryRepo().deleteMany();
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
        preferences: (spec.preferences ?? {}) as Prisma.InputJsonValue
      } as Prisma.UserUncheckedCreateInput
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
    data: {
      name: spec.name,
      slug: spec.slug,
      settings: spec.settings as Prisma.InputJsonValue
    }
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

    const tasks: TaskWithMeta[] = [];
    for (const taskSpec of projectSpec.tasks) {
      const category = categories.get(taskSpec.category) ?? fallbackCategory;
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          categoryId: category.id,
          taskName: taskSpec.name,
          billableDefault: taskSpec.billableDefault
        } as Prisma.TaskUncheckedCreateInput
      });
      tasks.push({ task, spec: taskSpec });
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

async function categoryTaskCounts(workspaceId: string): Promise<string> {
  const rows = await categoryRepo().findMany({
    where: { workspaceId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { name: "asc" }
  });
  return rows.map((r: CategoryWithCount) => `${r.name}=${r._count.tasks}`).join(", ");
}

async function seedSampleInvite(projectCtx: ProjectCtx[], admin: User) {
  const portal = projectCtx.find((c) => c.project.name === "Client Portal Redesign");
  if (!portal) return;

  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + 14);

  await prisma.projectInvite.create({
    data: {
      projectId: portal.project.id,
      token: "seed-invite-acme-freelancer",
      email: "freelance@example.com",
      expiresAt: expires,
      createdById: admin.id
    }
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
          "by_category",
          "budget_vs_actual",
          "utilization",
          "users_without_time"
        ],
        format: "xlsx",
        columns: {
          time_entries: [
            "project",
            "category",
            "task",
            "member",
            "date",
            "hours",
            "billable",
            "amount"
          ]
        }
      }
    },
    {
      name: "Category breakdown (90d)",
      body: {
        from: from90.toISOString(),
        to: to.toISOString(),
        billable: "all",
        reportTypes: ["time_entries", "by_category", "by_task"],
        format: "xlsx",
        groupBy: ["category"],
        sheetLayout: "tabs_per_category",
        columns: {
          time_entries: ["category", "project", "task", "member", "date", "hours", "billable"],
          by_category: [
            "category",
            "project",
            "total_hours",
            "billable_hours",
            "billable_amount",
            "active_tasks"
          ]
        }
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

function dayOfWeek(daysAgo: number): number {
  return utcDay(daysAgo, 12).getUTCDay();
}

function categoryDayBoost(category: SeedCategoryName, daysAgo: number): number {
  const dow = dayOfWeek(daysAgo);
  return DAY_CATEGORY_BOOST[category]?.[dow] ?? 1;
}

function taskPickWeight(taskMeta: TaskWithMeta, userSpec: SeedUserSpec, daysAgo: number): number {
  const base = taskMeta.spec.weight ?? 1;
  const bias = userSpec.categoryBias?.[taskMeta.spec.category] ?? 1;
  const dayBoost = categoryDayBoost(taskMeta.spec.category, daysAgo);
  return base * bias * dayBoost;
}

function pickWeightedTask(
  ctx: ProjectCtx,
  userSpec: SeedUserSpec,
  daysAgo: number,
  salt: number
): TaskWithMeta {
  const weights = ctx.tasks.map((t) => taskPickWeight(t, userSpec, daysAgo));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = hash01(daysAgo, salt, userSpec.email.length) * total;
  for (let i = 0; i < ctx.tasks.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return ctx.tasks[i]!;
  }
  return ctx.tasks[ctx.tasks.length - 1]!;
}

function pickProject(
  userProjects: ProjectCtx[],
  userSpec: SeedUserSpec,
  daysAgo: number,
  salt: number
): ProjectCtx {
  if (userProjects.length === 1) return userProjects[0]!;
  const weights = userProjects.map((ctx) => {
    const burn = ctx.spec.budgetBurnPct ?? 0.7;
    return 0.85 + burn * 0.35 + hash01(daysAgo, salt, ctx.project.id.length) * 0.15;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let r = hash01(daysAgo, salt + 1, userSpec.email.length) * total;
  for (let i = 0; i < userProjects.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return userProjects[i]!;
  }
  return userProjects[userProjects.length - 1]!;
}

function logDescriptionFor(category: SeedCategoryName, daysAgo: number, salt: number): string {
  const pool = CATEGORY_LOG_DESCRIPTIONS[category] ?? LOG_DESCRIPTIONS;
  return pool[Math.floor(hash01(daysAgo, salt, category.length) * pool.length)]!;
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
        const ctx = pickProject(userProjects, userSpec, daysAgo, e);
        const taskMeta = pickWeightedTask(ctx, userSpec, daysAgo, e);
        const { task, spec: taskSpec } = taskMeta;

        const billableDefault = task.billableDefault;
        const isBillable = billableDefault
          ? hash01(daysAgo, e, 5) > 0.08
          : hash01(daysAgo, e, 5) > 0.75;

        const meetingStretch =
          taskSpec.category === "Meetings" ? 0.5 + hash01(daysAgo, e, 6) * 1.25 : 0;
        const hours = roundQuarter(
          0.75 + hash01(daysAgo, e, 6) * (weekend ? 2 : 3.25) + meetingStretch
        );
        const start = utcDay(daysAgo, Math.floor(cursorMinutes / 60), cursorMinutes % 60);
        const end = new Date(start.getTime() + hours * 3600 * 1000);
        cursorMinutes += Math.round(hours * 60) + 30;
        dayCursorMinutes.set(dayKey, cursorMinutes);
        const burnBoost = ctx.spec.budgetBurnPct && ctx.spec.budgetBurnPct > 0.85 ? 1.12 : 1;
        if (hash01(daysAgo, e, 8) > userSpec.intensity * burnBoost) continue;

        const desc = logDescriptionFor(taskSpec.category, daysAgo, e);
        batch.push({
          userId: user.id,
          taskId: task.id,
          startTime: start,
          endTime: end,
          durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
          description: `${desc} — ${ctx.project.name}`,
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
                ? users.get("admin@kloqra.dev")!.id
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
  console.log("  KLOQRA SEED CREDENTIALS  (password for all accounts below)");
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

  const categoryRows = await categoryRepo().findMany({
    include: { _count: { select: { tasks: true } } }
  });
  const tasksByCategoryName = new Map<string, number>();
  for (const row of categoryRows) {
    tasksByCategoryName.set(row.name, (tasksByCategoryName.get(row.name) ?? 0) + row._count.tasks);
  }
  const tasksPerCategoryAvg = Object.fromEntries(
    [...tasksByCategoryName.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, total]) => [name, Math.round((total / workspaces.length) * 10) / 10])
  );

  const hoursByCategory = await prisma.$queryRaw<{ category_name: string; hours: number }[]>`
    SELECT c.name AS category_name,
           ROUND(SUM(tl.duration_sec) / 3600.0, 1) AS hours
    FROM time_logs tl
    JOIN tasks t ON t.id = tl.task_id
    JOIN categories c ON c.id = t.category_id
    GROUP BY c.name
    ORDER BY hours DESC
  `;
  const categoryHoursPct = hoursByCategory.map((row) => {
    const totalH = (totals._sum.durationSec ?? 0) / 3600;
    return {
      category: row.category_name,
      hours: Number(row.hours),
      pct: totalH > 0 ? Math.round((Number(row.hours) / totalH) * 1000) / 10 : 0
    };
  });

  console.log("Seed complete:", {
    users: users.size,
    workspaces: workspaces.length,
    projects: SEED_WORKSPACES.length * 4,
    categoriesPerWorkspace: SEED_CATEGORIES.length,
    tasksPerCategoryAvg,
    hoursByCategory: categoryHoursPct,
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
