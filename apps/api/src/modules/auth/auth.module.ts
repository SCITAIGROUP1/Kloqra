import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessModule } from "../../common/access/access.module";
import { AuthRevocationService } from "../../common/auth/auth-revocation.service";
import { JwtTokenService } from "../../common/auth/jwt-token.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PlatformJwtAuthGuard } from "../../common/guards/platform-jwt-auth.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { TenantProvisioningModule } from "../../common/tenant/tenant-provisioning.module";
import { PlatformAuditModule } from "../platform/platform-audit.module";
import { AuthService } from "./application/auth.service";
import { AuthController } from "./interface/http/auth.controller";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-min-32-chars-long",
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRES ?? "15m" }
    }),
    PlatformAuditModule,
    AccessModule,
    TenantProvisioningModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenService,
    JwtAuthGuard,
    PlatformJwtAuthGuard,
    SessionAuthGuard,
    AuthRevocationService
  ],
  exports: [
    AuthService,
    JwtModule,
    JwtTokenService,
    JwtAuthGuard,
    PlatformJwtAuthGuard,
    SessionAuthGuard,
    AuthRevocationService,
    AccessModule
  ]
})
export class AuthModule {}
