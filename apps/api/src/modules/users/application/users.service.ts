import {
  ErrorCodes,
  mergeUserPreferences,
  parseUserPreferences,
  parseWorkspaceSettings,
  resolveEffectiveDailyTargetHours,
  resolveEffectiveDateFormat,
  resolveEffectiveTheme,
  resolveEffectiveTimeFormat,
  resolveEffectiveTimezone,
  type ChangePasswordDto,
  type UpdateUserPreferencesDto,
  type UpdateUserProfileDto,
  type UserProfileDto
} from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
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
  createdAt: true
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
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService
  ) {}

  async getProfile(userId: string, workspaceId: string): Promise<UserProfileDto> {
    const user = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: userProfileSelect as Prisma.UserSelect
    })) as unknown as UserProfileRecord;
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });
    const activityStats = await this.getActivityStats(userId, workspaceId, user.createdAt);
    return this.toProfileDto(user, workspace.settings, activityStats);
  }

  async updateProfile(userId: string, workspaceId: string, dto: UpdateUserProfileDto) {
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
      where: { id: workspaceId }
    });
    const activityStats = await this.getActivityStats(userId, workspaceId, user.createdAt);
    return this.toProfileDto(user, workspace.settings, activityStats);
  }

  async updatePreferences(
    userId: string,
    workspaceId: string,
    dto: UpdateUserPreferencesDto
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
      where: { id: workspaceId }
    });
    const activityStats = await this.getActivityStats(userId, workspaceId, user.createdAt);
    return this.toProfileDto(user, workspace.settings, activityStats);
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
    workspaceSettingsRaw: unknown,
    activityStats: UserProfileDto["activityStats"]
  ): UserProfileDto {
    const preferences = parseUserPreferences(user.preferences);
    const workspaceSettings = parseWorkspaceSettings(workspaceSettingsRaw);
    const names = this.resolveNames(user);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: names.firstName,
      lastName: names.lastName,
      phone: user.phone,
      location: user.location,
      avatarUrl: user.avatarUrl,
      jobTitle: user.jobTitle,
      department: user.department,
      workStartDate: user.workStartDate ? user.workStartDate.toISOString().slice(0, 10) : null,
      defaultHourlyRate: user.defaultHourlyRate?.toNumber() ?? null,
      preferences,
      effectiveDailyTargetHours: resolveEffectiveDailyTargetHours(
        preferences,
        workspaceSettings.dailyTargetHours
      ),
      effectiveTimezone: resolveEffectiveTimezone(preferences),
      effectiveDateFormat: resolveEffectiveDateFormat(preferences),
      effectiveTimeFormat: resolveEffectiveTimeFormat(preferences),
      effectiveTheme: resolveEffectiveTheme(preferences),
      twoFactorEnabled: Boolean(user.totpEnabledAt),
      activityStats,
      createdAt: user.createdAt.toISOString()
    };
  }
}
