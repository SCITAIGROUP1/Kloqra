import * as bcrypt from "bcrypt";
import {
  Prisma,
  PrismaClient,
  type Project,
  type Task,
  type User,
  type Workspace
} from "./generated/client";
import {
  buildPreferencesWithDashboardLayouts,
  SEED_ADMIN_DASHBOARD_LAYOUT,
  SEED_CLIENT_DASHBOARD_LAYOUT
} from "./seed-dashboard-layouts";
import {
  CATEGORY_LOG_DESCRIPTIONS,
  DAY_CATEGORY_BOOST,
  LOG_DESCRIPTIONS,
  SEED_CATEGORIES,
  SEED_DEMO_HIERARCHY,
  SEED_DEMO_PERSONAS,
  SEED_NOTIFICATIONS,
  SEED_PASSWORD,
  SEED_PLANS,
  SEED_PRICING_BASELINE_FEATURES,
  SEED_PLATFORM_SUPERADMIN,
  SEED_PLATFORM_SUPPORT,
  SEED_TENANT,
  SEED_TENANT_SUBSCRIPTION,
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

/** Approval policy starts far enough back that seeded history and periods qualify. */
function seedApprovalPolicyStart(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 120);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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

/** Task assignee + personal color delegates — typed at boundary for stale IDE Prisma clients (run `prisma generate`). */
function rollupRepo() {
  return prisma as unknown as {
    taskAssignee: {
      deleteMany: () => Promise<{ count: number }>;
      count: () => Promise<number>;
    };
    userProjectColor: {
      deleteMany: () => Promise<{ count: number }>;
      create: (args: {
        data: { userId: string; projectId: string; color: string };
      }) => Promise<unknown>;
      count: () => Promise<number>;
    };
    task: {
      count: (args: { where: { assignees: { none: Record<string, never> } } }) => Promise<number>;
    };
  };
}

/** Notification delegate — typed at boundary for stale IDE Prisma clients (run `prisma generate`). */
function notificationRepo() {
  return (
    prisma as unknown as {
      notification: {
        deleteMany: () => Promise<{ count: number }>;
        create: (args: {
          data: {
            userId: string;
            workspaceId: string;
            type: string;
            title: string;
            body: string;
            metadata: Prisma.InputJsonValue;
            readAt: Date | null;
            createdAt: Date;
          };
        }) => Promise<unknown>;
      };
    }
  ).notification;
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
  assigneeUserIds: string[];
};

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1)
  };
}

function resolveAssigneeUserIds(
  taskSpec: SeedTaskSpec,
  projectSpec: SeedProjectSpec,
  users: Map<string, User>
): string[] {
  const emails =
    taskSpec.assigneeEmails ?? projectSpec.memberEmails.filter((email) => users.has(email));
  return emails.map((email) => users.get(email)?.id).filter((id): id is string => Boolean(id));
}

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
  await seedPlans();
  await seedCatalogSettings();
  const tenant = await seedTenant(users);
  await seedTenantSubscription(tenant.id);
  await seedPlatformSuperadmin(passwordHash);
  const workspaces: Workspace[] = [];
  const allProjectCtx: ProjectCtx[] = [];

  for (const wsSpec of SEED_WORKSPACES) {
    const workspace = await seedWorkspace(wsSpec, users, tenant.id);
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

  const colorCount = await seedUserProjectColors(allProjectCtx, users);
  console.log(`  personal project colors: ${colorCount}`);

  const logCount = await seedTimeLogs(allProjectCtx, users);
  console.log(`  time logs: ${logCount} (history through yesterday — today is clean)`);

  const dashboardLayoutCount = await seedDashboardLayouts(users, workspaces);
  console.log(`  dashboard layouts: ${dashboardLayoutCount} user/workspace assignments`);

  const notificationCount = await seedNotifications(workspaces, users, allProjectCtx);
  console.log(`  notifications: ${notificationCount}`);

  const workflowDemo = await seedTimesheetWorkflowDemo(workspaces, users);
  console.log(
    `  timesheet workflow demo: ${workflowDemo.amendments} amendment(s), ${workflowDemo.notifications} notification(s)`
  );

  await seedHelpdesk(tenant.id);

  printCredentials();
  await printSummary(workspaces, users);
}

async function resetDatabase() {
  console.log("Resetting database…");
  await prisma.timeLogAuditEvent.deleteMany();
  await prisma.timeLog.deleteMany();
  await prisma.timesheetAmendmentRequest.deleteMany();
  await prisma.timesheetPeriod.deleteMany();
  await prisma.projectInvite.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await rollupRepo().taskAssignee.deleteMany();
  await rollupRepo().userProjectColor.deleteMany();
  await prisma.task.deleteMany();
  await prisma.hourlyRate.deleteMany();
  await prisma.exportSchedule.deleteMany();
  await prisma.exportPreset.deleteMany();
  await prisma.exportJob.deleteMany();
  await prisma.reportShare.deleteMany();
  await prisma.reportingApiCredential.deleteMany();
  await prisma.widgetShare.deleteMany();
  await prisma.project.deleteMany();
  await categoryRepo().deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.platformAuditEvent.deleteMany();
  await prisma.platformRefreshToken.deleteMany();
  await (
    prisma as unknown as { platformNotification: { deleteMany: () => Promise<unknown> } }
  ).platformNotification.deleteMany();
  await prisma.platformUser.deleteMany();
  await prisma.stripeWebhookEvent.deleteMany();
  await notificationRepo().deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.helpDeskAgent.deleteMany();
  await prisma.helpDeskTicketHistory.deleteMany();
  await prisma.helpDeskTicketMessage.deleteMany();
  await prisma.helpDeskTicket.deleteMany();
  await prisma.helpDeskQueue.deleteMany();
  await prisma.tenantMember.deleteMany();
  await prisma.tenantDataExportJob.deleteMany();
  await (
    prisma as unknown as { tenantSalesInquiryReceipt: { deleteMany: () => Promise<unknown> } }
  ).tenantSalesInquiryReceipt.deleteMany();
  await (
    prisma as unknown as { tenantSalesInquiry: { deleteMany: () => Promise<unknown> } }
  ).tenantSalesInquiry.deleteMany();
  await prisma.tenantSubscription.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
}

async function seedHelpdesk(_tenantId: string) {
  const superadmin = await prisma.platformUser.findUnique({
    where: { email: SEED_PLATFORM_SUPERADMIN.email }
  });
  if (!superadmin) return;

  const QUEUE_CONFIGS = [
    {
      name: "General Support",
      slug: "general-support",
      description: "Default queue for general inquiries and catch-all tickets.",
      color: "#6366f1",
      sortOrder: 0,
      slaPolicy: { firstResponseMinutes: 480, resolutionMinutes: 2880 }
    },
    {
      name: "Technical Support",
      slug: "technical-support",
      description: "Application bugs, in-app quality reports, and technical issues.",
      color: "#ef4444",
      sortOrder: 1,
      slaPolicy: { firstResponseMinutes: 60, resolutionMinutes: 480 }
    },
    {
      name: "Billing & Accounts",
      slug: "billing-accounts",
      description: "Payment issues, invoices, refunds, and plan changes.",
      color: "#f59e0b",
      sortOrder: 2,
      slaPolicy: { firstResponseMinutes: 120, resolutionMinutes: 240 }
    },
    {
      name: "Product Feedback",
      slug: "product-feedback",
      description: "Feature requests and product improvement suggestions.",
      color: "#10b981",
      sortOrder: 3,
      slaPolicy: { firstResponseMinutes: 480, resolutionMinutes: 4320 }
    },
    {
      name: "Security Response",
      slug: "security-response",
      description:
        "Security incidents, vulnerability reports, and data concerns. Highest priority SLA.",
      color: "#dc2626",
      sortOrder: 4,
      slaPolicy: { firstResponseMinutes: 15, resolutionMinutes: 120 }
    }
  ];

  const queues: { id: string; slug: string }[] = [];
  for (const config of QUEUE_CONFIGS) {
    const queue = await prisma.helpDeskQueue.create({
      data: {
        name: config.name,
        slug: config.slug,
        description: config.description,
        color: config.color,
        sortOrder: config.sortOrder,
        slaPolicy: config.slaPolicy
      }
    });
    queues.push({ id: queue.id, slug: queue.slug });
  }

  // Assign superadmin to ALL queues so they receive tickets from any type
  for (const queue of queues) {
    await prisma.helpDeskAgent.create({
      data: { platformUserId: superadmin.id, queueId: queue.id, isActive: true }
    });
  }

  // --- Seed Sample Tickets ---
  const sampleTickets = [
    {
      subject: "Unable to save time log on iOS",
      requesterName: "Alice Mobile",
      requesterEmail: "alice@example.com",
      channel: "WEB_FORM" as any,
      ticketType: "BUG_REPORT" as any,
      priority: "HIGH" as any,
      status: "OPEN" as any,
      queueSlug: "technical-support",
      metadata: {
        severity: "high",
        stepsToReproduce: "Open app, click save, it spins forever",
        browserEnv: "iOS Safari"
      }
    },
    {
      subject: "Charged twice for March invoice",
      requesterName: "Bob Finance",
      requesterEmail: "bob@acme.com",
      channel: "EMAIL" as any,
      ticketType: "BILLING" as any,
      priority: "CRITICAL" as any,
      status: "OPEN" as any,
      queueSlug: "billing-accounts",
      metadata: {
        billingIssueType: "payment_failed",
        invoiceId: "INV-2026-003",
        transactionDate: "2026-03-01"
      }
    },
    {
      subject: "Security vulnerability in custom domain",
      requesterName: "Security Researcher",
      requesterEmail: "researcher@hacker.org",
      channel: "API" as any,
      ticketType: "SECURITY" as any,
      priority: "CRITICAL" as any,
      status: "IN_PROGRESS" as any,
      queueSlug: "security-response",
      metadata: { incidentType: "vulnerability", affectedArea: "Public checkout flow" }
    },
    {
      subject: "Requesting Dark Mode",
      requesterName: "Charlie Designer",
      requesterEmail: "charlie@design.com",
      channel: "WEB_FORM" as any,
      ticketType: "FEATURE_REQUEST" as any,
      priority: "LOW" as any,
      status: "OPEN" as any,
      queueSlug: "product-feedback",
      metadata: { productArea: "UI/UX Design", businessImpact: "My eyes hurt at night" }
    },
    {
      subject: "How do I upgrade to Enterprise?",
      requesterName: "David CEO",
      requesterEmail: "david@bigcorp.com",
      channel: "WEB_FORM" as any,
      ticketType: "PLAN_QUESTION" as any,
      priority: "MEDIUM" as any,
      status: "PENDING" as any,
      queueSlug: "billing-accounts",
      metadata: { currentPlan: "pro", interestedPlan: "enterprise", questionDetail: "upgrade" }
    }
  ];

  let ticketCount = 0;
  for (const t of sampleTickets) {
    const queue = queues.find((q) => q.slug === t.queueSlug) || queues[0];

    // Assign one ticket to superadmin for demo purposes
    const assignedToId = t.ticketType === "SECURITY" ? superadmin.id : null;

    await prisma.helpDeskTicket.create({
      data: {
        subject: t.subject,
        requesterName: t.requesterName,
        requesterEmail: t.requesterEmail,
        channel: t.channel,
        ticketType: t.ticketType,
        priority: t.priority,
        status: t.status,
        queueId: queue.id,
        assignedToId,
        metadata: t.metadata,
        messages: {
          create: {
            direction: "INBOUND",
            authorName: t.requesterName,
            authorEmail: t.requesterEmail,
            body: `Description for: ${t.subject}\n\nPlease help resolve this as soon as possible.`
          }
        },
        history: {
          create: {
            actorName: "System",
            action: "ticket_created",
            after: { queueId: queue.id, status: t.status }
          }
        }
      }
    });
    ticketCount++;
  }

  console.log(
    `  helpdesk seeded: ${queues.length} queues, superadmin (${superadmin.email}) assigned to all, ${ticketCount} sample tickets created`
  );
}

async function seedDashboardLayouts(
  users: Map<string, User>,
  workspaces: Workspace[]
): Promise<number> {
  const workspaceBySlug = new Map(workspaces.map((workspace) => [workspace.slug, workspace]));
  let updated = 0;

  for (const wsSpec of SEED_WORKSPACES) {
    const workspace = workspaceBySlug.get(wsSpec.slug);
    if (!workspace) continue;

    for (const email of wsSpec.memberEmails) {
      const userSpec = SEED_USERS.find((u) => u.email === email);
      if (!userSpec) continue;

      const user = users.get(email);
      if (!user) continue;

      if (userSpec.role === "ADMIN") {
        const merged = buildPreferencesWithDashboardLayouts(
          user.preferences,
          workspace.id,
          "admin",
          SEED_ADMIN_DASHBOARD_LAYOUT,
          SEED_ADMIN_DASHBOARD_LAYOUT
        );

        const saved = await prisma.user.update({
          where: { id: user.id },
          data: { preferences: merged as Prisma.InputJsonValue }
        });

        users.set(email, saved);
        updated++;
        continue;
      }

      if (userSpec.role === "MEMBER") {
        const merged = buildPreferencesWithDashboardLayouts(
          user.preferences,
          workspace.id,
          "client",
          SEED_CLIENT_DASHBOARD_LAYOUT,
          SEED_CLIENT_DASHBOARD_LAYOUT
        );

        const saved = await prisma.user.update({
          where: { id: user.id },
          data: { preferences: merged as Prisma.InputJsonValue }
        });

        users.set(email, saved);
        updated++;
      }
    }
  }

  return updated;
}

async function seedUsers(passwordHash: string): Promise<Map<string, User>> {
  const users = new Map<string, User>();
  for (const spec of SEED_USERS) {
    const { firstName, lastName } = splitDisplayName(spec.name);
    const user = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash,
        name: spec.name,
        firstName,
        lastName: lastName || null,
        defaultHourlyRate: spec.defaultHourlyRate,
        mustChangePassword: spec.mustChangePassword ?? false,
        emailVerifiedAt: spec.emailVerified === false ? null : new Date(),
        preferences: (spec.preferences ?? {}) as Prisma.InputJsonValue
      } as Prisma.UserUncheckedCreateInput
    });
    users.set(spec.email, user);
  }
  return users;
}

async function seedTenant(users: Map<string, User>) {
  const tenant = await prisma.tenant.create({
    data: {
      name: SEED_TENANT.name,
      slug: SEED_TENANT.slug,
      status: SEED_TENANT.status,
      settings: SEED_TENANT.settings as Prisma.InputJsonValue
    }
  });

  for (const member of SEED_TENANT.members) {
    const user = users.get(member.email);
    if (!user) continue;
    await prisma.tenantMember.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: member.role
      }
    });
  }

  console.log(`  tenant: ${tenant.slug} (${SEED_WORKSPACES.length} workspaces)`);
  return tenant;
}

async function seedPlans() {
  for (const plan of SEED_PLANS) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        limits: plan.limits as Prisma.InputJsonValue,
        isPublic: plan.isPublic,
        sortOrder: plan.sortOrder,
        stripeProductId: plan.stripeProductId,
        stripePriceId: plan.stripePriceId,
        tagline: plan.tagline,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        features: plan.features as Prisma.InputJsonValue,
        recommended: plan.recommended,
        billingMode: plan.billingMode,
        contactHref: plan.contactHref,
        visibleOnPricing: plan.visibleOnPricing
      },
      update: {
        name: plan.name,
        slug: plan.slug,
        limits: plan.limits as Prisma.InputJsonValue,
        isPublic: plan.isPublic,
        sortOrder: plan.sortOrder,
        stripeProductId: plan.stripeProductId,
        stripePriceId: plan.stripePriceId,
        tagline: plan.tagline,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        features: plan.features as Prisma.InputJsonValue,
        recommended: plan.recommended,
        billingMode: plan.billingMode,
        contactHref: plan.contactHref,
        visibleOnPricing: plan.visibleOnPricing
      }
    });
  }
  console.log(`  plans: ${SEED_PLANS.map((p) => p.slug).join(", ")}`);
}

async function seedCatalogSettings() {
  await prisma.platformCatalogSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      pricingBaselineFeatures: [...SEED_PRICING_BASELINE_FEATURES]
    },
    update: {
      pricingBaselineFeatures: [...SEED_PRICING_BASELINE_FEATURES]
    }
  });
}

async function seedTenantSubscription(tenantId: string) {
  const plan = SEED_PLANS.find((p) => p.slug === SEED_TENANT_SUBSCRIPTION.planSlug);
  if (!plan) {
    throw new Error(`Seed plan not found: ${SEED_TENANT_SUBSCRIPTION.planSlug}`);
  }
  await prisma.tenantSubscription.create({
    data: {
      tenantId,
      planId: plan.id,
      status: SEED_TENANT_SUBSCRIPTION.status
    }
  });
  console.log(`  subscription: ${plan.slug} (${SEED_TENANT_SUBSCRIPTION.status})`);
}

async function seedPlatformSuperadmin(superadminHash: string) {
  await prisma.platformUser.upsert({
    where: { email: SEED_PLATFORM_SUPERADMIN.email },
    update: {
      passwordHash: superadminHash,
      name: SEED_PLATFORM_SUPERADMIN.name,
      role: "SUPERADMIN"
    },
    create: {
      email: SEED_PLATFORM_SUPERADMIN.email,
      passwordHash: superadminHash,
      name: SEED_PLATFORM_SUPERADMIN.name,
      role: "SUPERADMIN"
    }
  });
  console.log(`  platform superadmin: ${SEED_PLATFORM_SUPERADMIN.email}`);

  await prisma.platformUser.upsert({
    where: { email: SEED_PLATFORM_SUPPORT.email },
    update: {
      passwordHash: superadminHash,
      name: SEED_PLATFORM_SUPPORT.name,
      role: "SUPPORT"
    },
    create: {
      email: SEED_PLATFORM_SUPPORT.email,
      passwordHash: superadminHash,
      name: SEED_PLATFORM_SUPPORT.name,
      role: "SUPPORT"
    }
  });
  console.log(`  platform support agent: ${SEED_PLATFORM_SUPPORT.email}`);
}

async function seedWorkspace(
  spec: SeedWorkspaceSpec,
  users: Map<string, User>,
  tenantId: string
): Promise<Workspace> {
  const workspace = await prisma.workspace.create({
    data: {
      tenantId,
      name: spec.name,
      slug: spec.slug,
      settings: spec.settings as Prisma.InputJsonValue
    }
  });

  for (const email of spec.memberEmails) {
    const user = users.get(email);
    if (!user) continue;
    const isWorkspaceAdmin = spec.workspaceAdminEmails?.includes(email) ?? false;
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: isWorkspaceAdmin ? "ADMIN" : "MEMBER"
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
    const approvalPolicyStart = projectSpec.timesheetApproval ? seedApprovalPolicyStart() : null;
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: projectSpec.name,
        color: projectSpec.color,
        clientName: projectSpec.clientName,
        budgetHours: projectSpec.budgetHours,
        isActive: true,
        timesheetApprovalEnabled: projectSpec.timesheetApproval ?? false,
        timesheetApprovalPeriod: projectSpec.timesheetApproval ? "weekly" : null,
        timesheetApprovalEnabledAt: approvalPolicyStart,
        timesheetApprovalPeriodEffectiveAt: approvalPolicyStart
      }
    });

    const team = await prisma.team.create({ data: { projectId: project.id } });

    for (const email of projectSpec.memberEmails) {
      const user = users.get(email);
      if (!user) continue;
      const isLead = projectSpec.leadEmails?.includes(email) ?? false;
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: isLead ? "PROJECT_MANAGER" : "MEMBER",
          isActive: true
        }
      });
    }

    const tasks: TaskWithMeta[] = [];
    for (const taskSpec of projectSpec.tasks) {
      const category = categories.get(taskSpec.category) ?? fallbackCategory;
      const assigneeUserIds = resolveAssigneeUserIds(taskSpec, projectSpec, users);
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          categoryId: category.id,
          taskName: taskSpec.name,
          billableDefault: taskSpec.billableDefault,
          ...(assigneeUserIds.length > 0
            ? {
                assignees: {
                  create: assigneeUserIds.map((userId) => ({ userId }))
                }
              }
            : {})
        } as Prisma.TaskUncheckedCreateInput
      });
      tasks.push({ task, spec: taskSpec, assigneeUserIds });
    }

    ctx.push({ project, tasks, spec: projectSpec, workspaceId: workspace.id });
  }

  return ctx;
}

async function seedUserProjectColors(
  projectCtx: ProjectCtx[],
  users: Map<string, User>
): Promise<number> {
  let created = 0;
  for (const ctx of projectCtx) {
    const overrides = ctx.spec.memberColorOverrides;
    if (!overrides) continue;
    for (const [email, color] of Object.entries(overrides)) {
      const user = users.get(email);
      if (!user) continue;
      await rollupRepo().userProjectColor.create({
        data: { userId: user.id, projectId: ctx.project.id, color }
      });
      created++;
    }
  }
  return created;
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

async function seedNotifications(
  workspaces: Workspace[],
  users: Map<string, User>,
  allProjectCtx: ProjectCtx[]
): Promise<number> {
  const workspaceBySlug = new Map(workspaces.map((workspace) => [workspace.slug, workspace]));
  const projectByKey = new Map(
    allProjectCtx.map((ctx) => [`${ctx.workspaceId}:${ctx.project.name}`, ctx.project])
  );

  let created = 0;
  for (const spec of SEED_NOTIFICATIONS) {
    const user = users.get(spec.recipientEmail);
    const workspace = workspaceBySlug.get(spec.workspaceSlug);
    if (!user || !workspace) continue;

    const metadata: Record<string, unknown> = { ...(spec.metadata ?? {}) };
    if (spec.projectName) {
      const project = projectByKey.get(`${workspace.id}:${spec.projectName}`);
      if (project) {
        metadata.projectId = project.id;
        if (!metadata.href) {
          if (spec.type === "APPROVAL_REQUEST") {
            metadata.href = "/approvals?tab=review";
          } else if (spec.type === "TIMESHEET_STATUS") {
            metadata.href = `/submissions?projectId=${project.id}`;
          } else {
            metadata.href = `/projects/${project.id}`;
          }
        }
      }
    }

    const ageMs = spec.read ? 2 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    await notificationRepo().create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        type: spec.type,
        title: spec.title,
        body: spec.body,
        metadata: metadata as Prisma.InputJsonValue,
        readAt: spec.read ? new Date(Date.now() - ageMs) : null,
        createdAt: new Date(Date.now() - ageMs)
      }
    });
    created++;
  }

  return created;
}

async function seedTimesheetWorkflowDemo(
  workspaces: Workspace[],
  users: Map<string, User>
): Promise<{ amendments: number; notifications: number }> {
  const acme = workspaces.find((workspace) => workspace.slug === "acme");
  const member = users.get("member@kloqra.dev");
  const admin = users.get("admin@kloqra.dev");
  if (!acme || !member || !admin) {
    return { amendments: 0, notifications: 0 };
  }

  let amendments = 0;
  let notifications = 0;

  const submitted = await prisma.timesheetPeriod.findFirst({
    where: {
      workspaceId: acme.id,
      userId: member.id,
      status: "SUBMITTED",
      project: { name: "Client Portal Redesign" }
    },
    include: { project: true },
    orderBy: { periodStart: "desc" }
  });

  const approved = await prisma.timesheetPeriod.findFirst({
    where: {
      workspaceId: acme.id,
      userId: member.id,
      status: "APPROVED",
      project: { name: "Client Portal Redesign" }
    },
    include: { project: true },
    orderBy: { periodStart: "desc" }
  });

  const rejected = await prisma.timesheetPeriod.findFirst({
    where: {
      workspaceId: acme.id,
      userId: member.id,
      status: "REJECTED",
      project: { name: "Client Portal Redesign" }
    },
    include: { project: true },
    orderBy: { periodStart: "desc" }
  });

  if (submitted) {
    await notificationRepo().create({
      data: {
        userId: admin.id,
        workspaceId: acme.id,
        type: "APPROVAL_REQUEST",
        title: "Timesheet submitted for review",
        body: `Sam Rivera submitted ${submitted.project.name} for review.`,
        metadata: {
          variant: "attention",
          ctaLabel: "Review",
          projectId: submitted.projectId,
          periodId: submitted.id,
          href: `/approvals?tab=review&periodId=${submitted.id}`
        } as Prisma.InputJsonValue,
        readAt: null,
        createdAt: new Date(Date.now() - 30 * 60 * 1000)
      }
    });
    notifications++;
  }

  if (rejected) {
    await notificationRepo().create({
      data: {
        userId: member.id,
        workspaceId: acme.id,
        type: "TIMESHEET_STATUS",
        title: "Timesheet rejected",
        body: `Your ${rejected.project.name} timesheet was rejected. Please fix and resubmit.`,
        metadata: {
          variant: "warning",
          ctaLabel: "Fix & resubmit",
          projectId: rejected.projectId,
          periodStart: rejected.periodStart.toISOString(),
          href: `/submissions?projectId=${rejected.projectId}&periodStart=${encodeURIComponent(rejected.periodStart.toISOString())}&highlight=rejected`,
          details: [
            { label: "Project", value: rejected.project.name },
            { label: "Period", value: rejected.periodStart.toISOString().slice(0, 10) },
            { label: "Reason", value: rejected.reviewNote ?? "See review note" }
          ]
        } as Prisma.InputJsonValue,
        readAt: null,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    });
    notifications++;
  }

  if (approved) {
    const amendment = await prisma.timesheetAmendmentRequest.create({
      data: {
        periodId: approved.id,
        userId: member.id,
        workspaceId: acme.id,
        reason: "Need to correct billable hours on Tuesday entries before invoicing.",
        status: "PENDING"
      }
    });
    amendments++;

    await notificationRepo().create({
      data: {
        userId: admin.id,
        workspaceId: acme.id,
        type: "APPROVAL_REQUEST",
        title: "Timesheet edit request",
        body: `Sam Rivera requested to edit an approved ${approved.project.name} timesheet.`,
        metadata: {
          variant: "attention",
          ctaLabel: "Review request",
          projectId: approved.projectId,
          amendmentId: amendment.id,
          href: `/approvals?tab=amendments&amendmentId=${amendment.id}`
        } as Prisma.InputJsonValue,
        readAt: null,
        createdAt: new Date(Date.now() - 45 * 60 * 1000)
      }
    });
    notifications++;

    await notificationRepo().create({
      data: {
        userId: member.id,
        workspaceId: acme.id,
        type: "TIMESHEET_REMINDER",
        title: "Submit your timesheet",
        body: `Reminder to submit ${approved.project.name} when you are ready.`,
        metadata: {
          variant: "attention",
          ctaLabel: "Open submissions",
          projectId: approved.projectId,
          periodStart: approved.periodStart.toISOString(),
          href: `/submissions?projectId=${approved.projectId}&periodStart=${encodeURIComponent(approved.periodStart.toISOString())}&highlight=remind`
        } as Prisma.InputJsonValue,
        readAt: null,
        createdAt: new Date(Date.now() - 20 * 60 * 1000)
      }
    });
    notifications++;
  }

  return { amendments, notifications };
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

function getOffsetHours(timezone: string, date: Date): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset"
    });
    const tzPart = formatter.formatToParts(date).find((p) => p.type === "timeZoneName")?.value;
    if (!tzPart || tzPart === "GMT") return 0;
    const match = tzPart.match(/GMT([+-]\d+)/);
    if (match) return parseInt(match[1], 10);
  } catch {
    // ignore
  }
  return 0;
}

function utcDay(daysAgo: number, hour: number, minute = 0, timezone = "UTC"): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0); // stable anchor
  d.setUTCDate(d.getUTCDate() - daysAgo);
  const offset = getOffsetHours(timezone, d);
  d.setUTCHours(hour - offset, minute, 0, 0);
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

function assignableTasksForUser(
  ctx: ProjectCtx,
  userId: string,
  role: "ADMIN" | "MEMBER"
): TaskWithMeta[] {
  if (role === "ADMIN") {
    return ctx.tasks.filter((t) => t.assigneeUserIds.length > 0);
  }
  return ctx.tasks.filter((t) => t.assigneeUserIds.includes(userId));
}

function pickWeightedTask(
  ctx: ProjectCtx,
  userSpec: SeedUserSpec,
  userId: string,
  daysAgo: number,
  salt: number
): TaskWithMeta | null {
  const pool = assignableTasksForUser(ctx, userId, userSpec.role);
  if (pool.length === 0) return null;
  const weights = pool.map((t) => taskPickWeight(t, userSpec, daysAgo));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = hash01(daysAgo, salt, userSpec.email.length) * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
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
    const userProjects = projectCtx.filter((ctx) => {
      if (!ctx.spec.memberEmails.includes(userSpec.email)) return false;
      return assignableTasksForUser(ctx, user.id, userSpec.role).length > 0;
    });
    if (userProjects.length === 0) continue;

    // Skip today (daysAgo === 0) so dashboards and timers start with a clean slate.
    for (let daysAgo = userSpec.historyDays; daysAgo >= 1; daysAgo--) {
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
        const taskMeta = pickWeightedTask(ctx, userSpec, user.id, daysAgo, e);
        if (!taskMeta) continue;
        const { task, spec: taskSpec } = taskMeta;

        const billableDefault = task.billableDefault;
        // Members always inherit task billable default (matches API enforcement).
        const isBillable =
          userSpec.role === "MEMBER"
            ? billableDefault
            : billableDefault
              ? hash01(daysAgo, e, 5) > 0.08
              : hash01(daysAgo, e, 5) > 0.75;

        const meetingStretch =
          taskSpec.category === "Meetings" ? 0.5 + hash01(daysAgo, e, 6) * 1.25 : 0;
        const hours = roundQuarter(
          0.75 + hash01(daysAgo, e, 6) * (weekend ? 2 : 3.25) + meetingStretch
        );
        const start = utcDay(
          daysAgo,
          Math.floor(cursorMinutes / 60),
          cursorMinutes % 60,
          userSpec.preferences?.timezone ?? "UTC"
        );
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
            approvalPeriod: "weekly",
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

  console.log("  Hierarchy (platform → tenant → workspace → project → team):");
  for (const row of SEED_DEMO_HIERARCHY) {
    console.log(
      `    ${row.level.padEnd(26)} ${row.email.padEnd(24)} ${row.displayName} — ${row.scope}`
    );
  }

  const members = SEED_USERS.filter(
    (u) =>
      !Object.values(SEED_DEMO_PERSONAS).includes(
        u.email as (typeof SEED_DEMO_PERSONAS)[keyof typeof SEED_DEMO_PERSONAS]
      )
  );
  if (members.length > 0) {
    console.log(`\n  Additional workspace members (${members.length} — 90d history each):`);
    for (const u of members) {
      console.log(`    ${u.email.padEnd(28)} ${u.name}`);
    }
  }

  console.log("\n  Workspaces & project managers:");
  for (const ws of SEED_WORKSPACES) {
    const wsAdmins = ws.workspaceAdminEmails?.join(", ") ?? "—";
    console.log(`\n    ${ws.name} (${ws.slug}) — workspace admins: ${wsAdmins}`);
    for (const project of ws.projects) {
      const leads = project.leadEmails ?? [];
      const team = project.memberEmails.filter((email) => !leads.includes(email));
      console.log(`      ${project.name}`);
      console.log(`        leads:   ${leads.join(", ")}`);
      console.log(`        members: ${team.join(", ")}`);
    }
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

  const [assigneeCount, colorCount, unassignedTaskCount] = await Promise.all([
    rollupRepo().taskAssignee.count(),
    rollupRepo().userProjectColor.count(),
    rollupRepo().task.count({ where: { assignees: { none: {} } } })
  ]);

  const projectCount = SEED_WORKSPACES.reduce((total, ws) => total + ws.projects.length, 0);

  console.log("Seed complete:", {
    users: users.size,
    workspaces: workspaces.length,
    projects: projectCount,
    taskAssignees: assigneeCount,
    userProjectColors: colorCount,
    unassignedTasks: unassignedTaskCount,
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
