import {
  ErrorCodes,
  type TwoFactorDisableDto,
  type TwoFactorEnableResponseDto,
  type TwoFactorVerifyDto
} from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { generateSecret, generateURI, verify } from "../../../common/auth/otplib.util";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

const PLATFORM_TOTP_ISSUER = "Kloqra Platform";

@Injectable()
export class PlatformUsers2faService {
  constructor(private prisma: PrismaService) {}

  async enable(platformUserId: string, email: string): Promise<TwoFactorEnableResponseDto> {
    const user = await this.prisma.platformUser.findUniqueOrThrow({
      where: { id: platformUserId }
    });
    if (user.totpEnabledAt) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Two-factor authentication is already enabled",
        HttpStatus.CONFLICT
      );
    }

    const secret = await generateSecret();
    const otpauthUrl = await generateURI({ issuer: PLATFORM_TOTP_ISSUER, label: email, secret });

    await this.prisma.platformUser.update({
      where: { id: platformUserId },
      data: { totpSecret: secret, totpEnabledAt: null }
    });

    return { secret, otpauthUrl };
  }

  async verify(platformUserId: string, dto: TwoFactorVerifyDto): Promise<{ ok: true }> {
    const user = await this.prisma.platformUser.findUniqueOrThrow({
      where: { id: platformUserId }
    });
    if (!user.totpSecret) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Enable two-factor authentication first",
        HttpStatus.BAD_REQUEST
      );
    }
    const verification = await verify({ token: dto.code, secret: user.totpSecret });
    if (!verification.valid) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Invalid authentication code",
        HttpStatus.UNAUTHORIZED
      );
    }

    await this.prisma.platformUser.update({
      where: { id: platformUserId },
      data: { totpEnabledAt: new Date() }
    });
    return { ok: true };
  }

  async disable(platformUserId: string, dto: TwoFactorDisableDto): Promise<{ ok: true }> {
    const user = await this.prisma.platformUser.findUniqueOrThrow({
      where: { id: platformUserId }
    });
    if (!user.totpEnabledAt || !user.totpSecret) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Two-factor authentication is not enabled",
        HttpStatus.BAD_REQUEST
      );
    }

    const validPassword = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Current password is incorrect",
        HttpStatus.UNAUTHORIZED
      );
    }
    const verification = await verify({ token: dto.code, secret: user.totpSecret });
    if (!verification.valid) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Invalid authentication code",
        HttpStatus.UNAUTHORIZED
      );
    }

    await this.prisma.platformUser.update({
      where: { id: platformUserId },
      data: { totpSecret: null, totpEnabledAt: null }
    });
    return { ok: true };
  }
}
