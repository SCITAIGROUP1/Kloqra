import {
  ErrorCodes,
  type TwoFactorDisableDto,
  type TwoFactorEnableResponseDto,
  type TwoFactorVerifyDto
} from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { generateSecret, generateURI, verify } from "otplib";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class Users2faService {
  constructor(private prisma: PrismaService) {}

  async enable(userId: string, email: string): Promise<TwoFactorEnableResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.totpEnabledAt) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Two-factor authentication is already enabled",
        HttpStatus.CONFLICT
      );
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: "Kloqra", label: email, secret });

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabledAt: null }
    });

    return { secret, otpauthUrl };
  }

  async verify(userId: string, dto: TwoFactorVerifyDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
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

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabledAt: new Date() }
    });
    return { ok: true };
  }

  async disable(userId: string, dto: TwoFactorDisableDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
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

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabledAt: null }
    });
    return { ok: true };
  }

  async verifyCode(secret: string, code: string): Promise<boolean> {
    const verification = await verify({ token: code, secret });
    return verification.valid;
  }
}
