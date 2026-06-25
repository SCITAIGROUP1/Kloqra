import { describe, expect, it } from "vitest";
import {
  SEED_DEMO_HIERARCHY,
  SEED_DEMO_PERSONAS,
  SEED_EMAIL_DOMAIN,
  SEED_PLANS,
  SEED_PLATFORM_SUPERADMIN,
  SEED_TENANT,
  SEED_TENANT_SUBSCRIPTION,
  SEED_USERS,
  SEED_WORKSPACES
} from "./seed-data";

describe("seed-data", () => {
  it("uses kloqra.dev for all demo accounts", () => {
    for (const user of SEED_USERS) {
      expect(user.email.endsWith(`@${SEED_EMAIL_DOMAIN}`)).toBe(true);
    }
    expect(SEED_PLATFORM_SUPERADMIN.email.endsWith(`@${SEED_EMAIL_DOMAIN}`)).toBe(true);
  });

  it("defines one demo organization with two workspaces", () => {
    expect(SEED_TENANT.slug).toBe("kloqra-demo");
    expect(SEED_TENANT.status).toBe("active");
    expect(SEED_WORKSPACES.map((ws) => ws.slug)).toEqual(["acme", "meridian"]);
  });

  it("assigns tenant owner and one tenant admin at organization level", () => {
    expect(SEED_TENANT.members.map((m) => m.email)).toEqual([
      SEED_DEMO_PERSONAS.tenantOwner,
      SEED_DEMO_PERSONAS.tenantAdmin
    ]);
    expect(SEED_TENANT.members[0]?.role).toBe("OWNER");
    expect(SEED_TENANT.members[1]?.role).toBe("ADMIN");
  });

  it("keeps workspace admins out of tenant_members", () => {
    const tenantEmails = SEED_TENANT.members.map((m) => m.email);
    expect(tenantEmails).not.toContain(SEED_DEMO_PERSONAS.acmeWorkspaceAdmin);
    expect(tenantEmails).not.toContain(SEED_DEMO_PERSONAS.meridianWorkspaceAdmin);
  });

  it("assigns a distinct workspace admin per workspace", () => {
    const acme = SEED_WORKSPACES.find((ws) => ws.slug === "acme")!;
    const meridian = SEED_WORKSPACES.find((ws) => ws.slug === "meridian")!;

    expect(acme.workspaceAdminEmails).toEqual([SEED_DEMO_PERSONAS.acmeWorkspaceAdmin]);
    expect(meridian.workspaceAdminEmails).toEqual([SEED_DEMO_PERSONAS.meridianWorkspaceAdmin]);
    expect(acme.memberEmails).toContain(SEED_DEMO_PERSONAS.tenantAdmin);
    expect(meridian.memberEmails).not.toContain(SEED_DEMO_PERSONAS.tenantAdmin);
    expect(acme.memberEmails).toContain(SEED_DEMO_PERSONAS.tenantOwner);
    expect(meridian.memberEmails).toContain(SEED_DEMO_PERSONAS.tenantOwner);
  });

  it("documents a unique persona per hierarchy level", () => {
    const emails = SEED_DEMO_HIERARCHY.map((row) => row.email);
    expect(new Set(emails).size).toBe(emails.length);
    expect(SEED_DEMO_HIERARCHY).toHaveLength(7);
  });

  it("seeds three projects per workspace with members and leads assigned", () => {
    for (const workspace of SEED_WORKSPACES) {
      expect(workspace.projects).toHaveLength(3);
      for (const project of workspace.projects) {
        expect(project.memberEmails.length).toBeGreaterThan(0);
        expect(project.leadEmails?.length ?? 0).toBeGreaterThan(0);
        for (const lead of project.leadEmails ?? []) {
          expect(project.memberEmails).toContain(lead);
        }
      }
    }
  });

  it("gives every tenant user ninety days of history", () => {
    for (const user of SEED_USERS) {
      expect(user.historyDays).toBe(90);
    }
  });

  it("includes Acme Corporation as the primary demo workspace", () => {
    expect(SEED_WORKSPACES[0]?.name).toBe("Acme Corporation");
    expect(SEED_WORKSPACES[0]?.slug).toBe("acme");
  });

  it("defines pilot, starter, and pro catalog plans", () => {
    expect(SEED_PLANS.map((p) => p.slug)).toEqual(["pilot", "starter", "pro"]);
    expect(SEED_TENANT_SUBSCRIPTION.planSlug).toBe("pilot");
    expect(SEED_TENANT_SUBSCRIPTION.status).toBe("active");
  });
});
