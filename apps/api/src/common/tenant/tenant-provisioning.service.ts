import type { PlanLimits } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { splitDisplayName } from "../../modules/users/application/user-name.util";
import { generateTempPassword, hashPassword } from "../auth/password.util";
import { generatedPrisma } from "../prisma/generated-prisma.util";
import { PrismaService } from "../prisma/prisma.service";
import { resolveUniqueSlug } from "./slug.util";

export type TenantProvisioningMode = "platform" | "self_serve";

export type ProvisionTenantInput = {
  mode: TenantProvisioningMode;
  organizationName: string;
  ownerEmail: string;
  ownerName: string;
  planId: string;
  subscriptionStatus?: "trial" | "active";
  billingInterval?: "monthly" | "yearly";
  /** When set and status is trial, overrides the default 30-day trial end. */
  trialEndsAt?: Date | null;
  limitsOverride?: Partial<PlanLimits> | null;
  firstWorkspace?: { name: string; slug?: string };
  tenantAdminEmail?: string;
  /** Self-serve only — caller supplies hashed password. */
  passwordHash?: string;
};

export type ProvisionTenantResult = {
  tenantId: string;
  ownerUserId: string;
  workspaceId?: string;
  temporaryPassword?: string;
  tenantAdminUserId?: string;
  tenantAdminTemporaryPassword?: string;
};

@Injectable()
export class TenantProvisioningService {
  constructor(private prisma: PrismaService) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  async provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
    const db = this.db();
    const email = input.ownerEmail.trim().toLowerCase();
    const organizationName = input.organizationName.trim();
    const ownerName = input.ownerName.trim() || organizationName;
    const { firstName, lastName } = splitDisplayName(ownerName);
    const subscriptionStatus = input.subscriptionStatus ?? "trial";
    const billingInterval = input.billingInterval ?? null;
    const now = new Date();
    let trialEndsAt: Date | null = null;
    if (subscriptionStatus === "trial") {
      if (input.trialEndsAt) {
        trialEndsAt = input.trialEndsAt;
      } else {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 30);
      }
    }

    let currentPeriodStart: Date | null = null;
    let currentPeriodEnd: Date | null = null;
    if (subscriptionStatus === "active" && billingInterval) {
      currentPeriodStart = now;
      currentPeriodEnd = new Date(now);
      if (billingInterval === "yearly") {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      } else {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }
    }

    const tenantSlug = await resolveUniqueSlug(
      (slug) => db.tenant.findUnique({ where: { slug } }),
      organizationName
    );

    let passwordHash = input.passwordHash;
    let temporaryPassword: string | undefined;

    if (input.mode === "platform") {
      temporaryPassword = generateTempPassword();
      passwordHash = await hashPassword(temporaryPassword);
    } else if (!passwordHash) {
      throw new Error("passwordHash is required for self_serve provisioning");
    }

    const firstWorkspace =
      input.firstWorkspace ??
      (input.mode === "self_serve" ? { name: `${organizationName} Workspace` } : undefined);

    const result = await this.prisma.$transaction(async (tx) => {
      const gtx = generatedPrisma(tx);
      const tenant = await gtx.tenant.create({
        data: {
          name: organizationName,
          slug: tenantSlug,
          status: "pending_setup",
          settings: {}
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash: passwordHash!,
          name: ownerName,
          firstName,
          lastName,
          mustChangePassword: input.mode === "platform",
          emailVerifiedAt: input.mode === "platform" ? new Date() : null
        }
      });

      await gtx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER"
        }
      });

      await gtx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: input.planId,
          status: subscriptionStatus,
          trialEndsAt,
          billingInterval,
          ...(currentPeriodStart ? { currentPeriodStart } : {}),
          ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
          ...(input.limitsOverride ? { limitsOverride: input.limitsOverride } : {})
        }
      });

      let workspaceId: string | undefined;
      if (firstWorkspace) {
        const workspaceSlug = await resolveUniqueSlug(
          (slug) => tx.workspace.findUnique({ where: { slug } }),
          firstWorkspace.name,
          firstWorkspace.slug
        );
        const workspace = await gtx.workspace.create({
          data: {
            tenantId: tenant.id,
            name: firstWorkspace.name.trim(),
            slug: workspaceSlug,
            settings: {}
          }
        });
        workspaceId = workspace.id;
        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: "ADMIN"
          }
        });
      }

      let tenantAdminUserId: string | undefined;
      let tenantAdminTemporaryPassword: string | undefined;

      if (input.tenantAdminEmail) {
        const adminEmail = input.tenantAdminEmail.trim().toLowerCase();
        tenantAdminTemporaryPassword = generateTempPassword();
        const adminPasswordHash = await hashPassword(tenantAdminTemporaryPassword);
        const adminDisplayName =
          adminEmail
            .split("@")[0]
            ?.replace(/[._-]+/g, " ")
            .trim() || "Admin";
        const adminNameParts = splitDisplayName(adminDisplayName);
        const adminUser = await tx.user.create({
          data: {
            email: adminEmail,
            passwordHash: adminPasswordHash,
            name: adminDisplayName,
            firstName: adminNameParts.firstName,
            lastName: adminNameParts.lastName,
            mustChangePassword: input.mode === "platform",
            emailVerifiedAt: input.mode === "platform" ? new Date() : null
          }
        });
        tenantAdminUserId = adminUser.id;

        await gtx.tenantMember.create({
          data: {
            tenantId: tenant.id,
            userId: adminUser.id,
            role: "ADMIN"
          }
        });

        if (workspaceId) {
          await tx.workspaceMember.create({
            data: {
              workspaceId,
              userId: adminUser.id,
              role: "ADMIN"
            }
          });
        }
      }

      return {
        tenantId: tenant.id,
        ownerUserId: user.id,
        workspaceId,
        tenantAdminUserId,
        tenantAdminTemporaryPassword
      };
    });

    return {
      tenantId: result.tenantId,
      ownerUserId: result.ownerUserId,
      workspaceId: result.workspaceId,
      ...(temporaryPassword ? { temporaryPassword } : {}),
      ...(result.tenantAdminUserId ? { tenantAdminUserId: result.tenantAdminUserId } : {}),
      ...(result.tenantAdminTemporaryPassword
        ? { tenantAdminTemporaryPassword: result.tenantAdminTemporaryPassword }
        : {})
    };
  }
}
