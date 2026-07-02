import {
  ErrorCodes,
  mergePlatformPreferences,
  parsePlatformPreferences,
  resolveEffectiveTheme,
  type ChangePlatformPasswordDto,
  type PlatformUserProfileDto,
  type UpdatePlatformPreferencesDto,
  type UpdatePlatformUserProfileDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { AuthRevocationService } from "../../../common/auth/auth-revocation.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
// eslint-disable-next-line no-restricted-imports
import { AuthService } from "../../auth/application/auth.service";

type PlatformUserRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences: Prisma.JsonValue;
  totpEnabledAt: Date | null;
};

@Injectable()
export class PlatformUsersService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private authRevocation: AuthRevocationService
  ) {}

  async getProfile(platformUserId: string): Promise<PlatformUserProfileDto> {
    const user = await this.findUser(platformUserId);
    return this.toProfileDto(user);
  }

  async updateProfile(
    platformUserId: string,
    dto: UpdatePlatformUserProfileDto
  ): Promise<PlatformUserProfileDto> {
    const user = await this.prisma.platformUser.update({
      where: { id: platformUserId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {})
      },
      select: this.selectFields
    });
    return this.toProfileDto(user);
  }

  async updatePreferences(
    platformUserId: string,
    dto: UpdatePlatformPreferencesDto
  ): Promise<PlatformUserProfileDto> {
    const existing = await this.prisma.platformUser.findUniqueOrThrow({
      where: { id: platformUserId },
      select: { preferences: true }
    });
    const current = parsePlatformPreferences(existing.preferences);
    const merged = mergePlatformPreferences(current, dto);
    const user = await this.prisma.platformUser.update({
      where: { id: platformUserId },
      data: { preferences: merged as Prisma.InputJsonValue },
      select: this.selectFields
    });
    return this.toProfileDto(user);
  }

  async changePassword(
    platformUserId: string,
    dto: ChangePlatformPasswordDto
  ): Promise<{ ok: true }> {
    const user = await this.prisma.platformUser.findUniqueOrThrow({
      where: { id: platformUserId }
    });
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Current password is incorrect",
        HttpStatus.UNAUTHORIZED
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.platformUser.update({
      where: { id: platformUserId },
      data: { passwordHash }
    });
    await this.revokeAllRefreshTokens(platformUserId);
    await this.authRevocation.revokeUser(platformUserId);
    return { ok: true };
  }

  private async revokeAllRefreshTokens(platformUserId: string): Promise<void> {
    const now = new Date();
    const sessions = await this.prisma.platformRefreshToken.findMany({
      where: { platformUserId, revokedAt: null, expiresAt: { gt: now } },
      select: { family: true },
      distinct: ["family"]
    });
    await this.prisma.platformRefreshToken.updateMany({
      where: { platformUserId, revokedAt: null },
      data: { revokedAt: now }
    });
    await Promise.all(sessions.map((s) => this.authRevocation.revokeFamily(s.family)));
  }

  private readonly selectFields = {
    id: true,
    email: true,
    name: true,
    role: true,
    preferences: true,
    totpEnabledAt: true
  } as const;

  private async findUser(platformUserId: string): Promise<PlatformUserRecord> {
    return this.prisma.platformUser.findUniqueOrThrow({
      where: { id: platformUserId },
      select: this.selectFields
    });
  }

  private toProfileDto(user: PlatformUserRecord): PlatformUserProfileDto {
    const preferences = parsePlatformPreferences(user.preferences);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: "SUPERADMIN",
      preferences,
      effectiveTheme: resolveEffectiveTheme(preferences),
      twoFactorEnabled: Boolean(user.totpEnabledAt)
    };
  }
}
