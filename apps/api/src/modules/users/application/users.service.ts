import {
  ErrorCodes,
  getWorkspaceDashboardLayout,
  mergeDashboardLayoutUpdate,
  mergeUserPreferences,
  parseUserPreferences,
  parseWorkspaceSettings,
  resolveEffectiveDailyTargetHours,
  resolveEffectiveDateFormat,
  resolveEffectiveTheme,
  resolveEffectiveTimeFormat,
  resolveEffectiveTimerStaleWarningHours,
  resolveEffectiveTimezone,
  type ChangePasswordDto,
  type DashboardApp,
  type DashboardLayoutResponseDto,
  type SetUserProjectColorDto,
  type UpdateDashboardLayoutDto,
  type UpdateUserPreferencesDto,
  type UpdateUserProfileDto,
  type UserProfileDto
} from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { AuthRevocationService } from "../../../common/auth/auth-revocation.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
// eslint-disable-next-line no-restricted-imports
import { AuthService } from "../../auth/application/auth.service";
import { composeDisplayName, splitDisplayName } from "./user-name.util";

const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  phone: true,
  location: true,
  avatarUrl: true,
  jobTitle: true,
  department: true,
  workStartDate: true,
  totpEnabledAt: true,
  defaultHourlyRate: true,
  preferences: true,
  createdAt: true,
  jiraEmail: true
} as const;

type UserProfileRecord = {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  location: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  workStartDate: Date | null;
  totpEnabledAt: Date | null;
  defaultHourlyRate: { toNumber(): number } | null;
  preferences: Prisma.JsonValue;
  createdAt: Date;
  jiraEmail: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private authRevocation: AuthRevocationService,
    private access: ProjectAccessService
  ) {}

  async getProfile(
    userId: string,
    workspaceId: string,
    role: "ADMIN" | "MEMBER"
  ): Promise<UserProfileDto> {
    const user = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: userProfileSelect as Prisma.UserSelect
    })) as unknown as UserProfileRecord;
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: { tenant: { select: { name: true, slug: true } } }
    });
    const activityStats = await this.getActivityStats(userId, workspaceId, user.createdAt);
    return this.toProfileDto(user, workspace, activityStats, role);
  }

  async updateProfile(
    userId: string,
    workspaceId: string,
    dto: UpdateUserProfileDto,
    role: "ADMIN" | "MEMBER"
  ) {
    const existing = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: userProfileSelect as Prisma.UserSelect
    })) as unknown as UserProfileRecord;

    const currentNames = this.resolveNames(existing);
    const firstName = dto.firstName ?? currentNames.firstName;
    const lastName = dto.lastName ?? currentNames.lastName;
    const name = dto.name ?? composeDisplayName(firstName, lastName);

    const user = (await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        firstName,
        lastName,
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle } : {}),
        ...(dto.department !== undefined ? { department: dto.department } : {}),
        ...(dto.workStartDate !== undefined
          ? { workStartDate: dto.workStartDate ? new Date(dto.workStartDate) : null }
          : {})
      },
      select: userProfileSelect as Prisma.UserSelect
    })) as unknown as UserProfileRecord;

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: { tenant: { select: { name: true, slug: true } } }
    });
    const activityStats = await this.getActivityStats(userId, workspaceId, user.createdAt);
    return this.toProfileDto(user, workspace, activityStats, role);
  }

  async updatePreferences(
    userId: string,
    workspaceId: string,
    dto: UpdateUserPreferencesDto,
    role: "ADMIN" | "MEMBER"
  ): Promise<UserProfileDto> {
    const existing = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { preferences: true } as Prisma.UserSelect
    })) as unknown as { preferences: Prisma.JsonValue };
    const currentPreferences = parseUserPreferences(existing.preferences);
    const merged = mergeUserPreferences(currentPreferences, dto);

    const user = (await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: merged as Prisma.InputJsonValue } as Prisma.UserUpdateInput,
      select: userProfileSelect as Prisma.UserSelect
    })) as unknown as UserProfileRecord;
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: { tenant: { select: { name: true, slug: true } } }
    });
    const activityStats = await this.getActivityStats(userId, workspaceId, user.createdAt);
    return this.toProfileDto(user, workspace, activityStats, role);
  }

  async getDashboardLayout(
    userId: string,
    workspaceId: string,
    app: DashboardApp
  ): Promise<DashboardLayoutResponseDto> {
    const user = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { preferences: true } as Prisma.UserSelect
    })) as unknown as { preferences: Prisma.JsonValue };
    const preferences = parseUserPreferences(user.preferences);
    const stored = getWorkspaceDashboardLayout(preferences, workspaceId, app);
    return {
      layout: stored.layout ?? null,
      defaultLayout: stored.defaultLayout ?? null
    };
  }

  async updateDashboardLayout(
    userId: string,
    workspaceId: string,
    dto: UpdateDashboardLayoutDto
  ): Promise<DashboardLayoutResponseDto> {
    const existing = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { preferences: true } as Prisma.UserSelect
    })) as unknown as { preferences: Prisma.JsonValue };
    const currentPreferences = parseUserPreferences(existing.preferences);
    const merged = mergeDashboardLayoutUpdate(currentPreferences, workspaceId, dto);

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: merged as Prisma.InputJsonValue } as Prisma.UserUpdateInput
    });

    return this.getDashboardLayout(userId, workspaceId, dto.app);
  }

  async setProjectColor(
    userId: string,
    workspaceId: string,
    projectId: string,
    dto: SetUserProjectColorDto
  ) {
    await this.access.assertCanAccessProject(workspaceId, userId, "MEMBER", projectId);
    await this.prisma.userProjectColor.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { userId, projectId, color: dto.color },
      update: { color: dto.color }
    });
    return { ok: true, color: dto.color };
  }

  async clearProjectColor(userId: string, workspaceId: string, projectId: string) {
    await this.access.assertCanAccessProject(workspaceId, userId, "MEMBER", projectId);
    await this.prisma.userProjectColor.deleteMany({ where: { userId, projectId } });
    return { ok: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Current password is incorrect",
        HttpStatus.UNAUTHORIZED
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
    await this.auth.revokeAllRefreshTokens(userId);
    await this.authRevocation.revokeUser(userId);
    return { ok: true };
  }

  private resolveNames(user: UserProfileRecord): { firstName: string; lastName: string } {
    if (user.firstName) {
      return { firstName: user.firstName, lastName: user.lastName ?? "" };
    }
    return splitDisplayName(user.name);
  }

  private async getActivityStats(userId: string, workspaceId: string, createdAt: Date) {
    const [durationAgg, projectCount] = await Promise.all([
      this.prisma.timeLog.aggregate({
        where: {
          userId,
          task: { project: { workspaceId } }
        },
        _sum: { durationSec: true }
      }),
      this.prisma.teamMember.count({
        where: {
          userId,
          isActive: true,
          team: { project: { workspaceId } }
        }
      })
    ]);

    const totalSeconds = durationAgg._sum.durationSec ?? 0;
    return {
      totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
      projectCount,
      memberSince: createdAt.toISOString()
    };
  }

  private toProfileDto(
    user: UserProfileRecord,
    workspace: {
      name: string;
      settings: unknown;
      tenant: { name: string; slug: string };
    },
    activityStats: UserProfileDto["activityStats"],
    role: "ADMIN" | "MEMBER"
  ): UserProfileDto {
    const parsedPreferences = parseUserPreferences(user.preferences);
    const { dashboardLayouts: _layouts, ...preferences } = parsedPreferences;
    const workspaceSettings = parseWorkspaceSettings(workspace.settings);
    const names = this.resolveNames(user);

    return {
      email: user.email,
      name: user.name,
      firstName: names.firstName,
      lastName: names.lastName,
      phone: user.phone,
      location: user.location,
      jobTitle: user.jobTitle,
      department: user.department,
      workStartDate: user.workStartDate ? user.workStartDate.toISOString().slice(0, 10) : null,
      ...(role === "ADMIN"
        ? { defaultHourlyRate: user.defaultHourlyRate?.toNumber() ?? null }
        : {}),
      preferences,
      effectiveDailyTargetHours: resolveEffectiveDailyTargetHours(
        parsedPreferences,
        workspaceSettings.dailyTargetHours
      ),
      effectiveTimerStaleWarningHours: resolveEffectiveTimerStaleWarningHours(workspaceSettings),
      effectiveTimezone: resolveEffectiveTimezone(parsedPreferences),
      effectiveDateFormat: resolveEffectiveDateFormat(parsedPreferences),
      effectiveTimeFormat: resolveEffectiveTimeFormat(parsedPreferences),
      effectiveTheme: resolveEffectiveTheme(parsedPreferences),
      twoFactorEnabled: Boolean(user.totpEnabledAt),
      workContext: {
        organizationName: workspace.tenant.name,
        workspaceName: workspace.name,
        workspaceRole: role
      },
      activityStats,
      jiraEmail: user.jiraEmail,
      jiraConnected: Boolean(
        user.jiraEmail && workspaceSettings.jiraSiteUrl && workspaceSettings.jiraServiceToken
      ),
      workspaceJiraSiteUrl: workspaceSettings.jiraSiteUrl ?? null
    };
  }
}
