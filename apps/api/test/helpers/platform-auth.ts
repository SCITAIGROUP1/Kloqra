import { ROUTES } from "@kloqra/contracts";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { generateSync } from "../../src/common/auth/otplib.util";
import { generatedPrisma } from "../../src/common/prisma/generated-prisma.util";
import { PrismaService } from "../../src/common/prisma/prisma.service";

export interface PlatformLoginSession {
  accessToken: string;
  userId: string;
  platformRole: "SUPERADMIN";
  user: { id: string; email: string; name: string };
}

let cachedPlatformTotpSecret: string | null = null;

export function setCachedPlatformTotpSecret(secret: string | null) {
  cachedPlatformTotpSecret = secret;
}

export function getCachedPlatformTotpSecret(): string | null {
  return cachedPlatformTotpSecret;
}

export async function loginAsPlatform(
  app: INestApplication,
  email = "platform@kloqra.dev",
  password = "password123"
): Promise<PlatformLoginSession> {
  const loginRes = await request(app.getHttpServer())
    .post("/auth/login")
    .set("X-Auth-Scope", "platform")
    .send({ email, password });

  if (loginRes.status !== 201) {
    throw new Error(
      `Platform login failed for ${email}: ${loginRes.status} ${JSON.stringify(loginRes.body)}`
    );
  }

  if (loginRes.body.requires2faSetup) {
    const pendingToken = loginRes.body.pendingToken as string;
    const enableRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.PLATFORM_2FA_SETUP_ENABLE)
      .send({ pendingToken });
    if (enableRes.status !== 201) {
      throw new Error(
        `Platform 2FA enable failed: ${enableRes.status} ${JSON.stringify(enableRes.body)}`
      );
    }
    cachedPlatformTotpSecret = enableRes.body.secret as string;
    const code = await generateSync({ secret: cachedPlatformTotpSecret });
    const completeRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.PLATFORM_COMPLETE_2FA_SETUP)
      .set("X-Auth-Scope", "platform")
      .send({ pendingToken, code });
    if (completeRes.status !== 201) {
      throw new Error(
        `Platform 2FA complete failed: ${completeRes.status} ${JSON.stringify(completeRes.body)}`
      );
    }
    return toSession(completeRes.body);
  }

  if (loginRes.body.requires2fa) {
    if (!cachedPlatformTotpSecret) {
      const platformUser = await generatedPrisma(app.get(PrismaService)).platformUser.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { totpSecret: true }
      });
      cachedPlatformTotpSecret = platformUser?.totpSecret ?? null;
    }
    if (!cachedPlatformTotpSecret) {
      throw new Error("Platform 2FA is enabled but no TOTP secret available for tests");
    }
    const code = await generateSync({ secret: cachedPlatformTotpSecret });
    const totpRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-Auth-Scope", "platform")
      .send({
        email,
        password,
        pendingToken: loginRes.body.pendingToken,
        totpCode: code
      });
    if (totpRes.status !== 201) {
      throw new Error(
        `Platform 2FA login failed: ${totpRes.status} ${JSON.stringify(totpRes.body)}`
      );
    }
    return toSession(totpRes.body);
  }

  return toSession(loginRes.body);
}

function toSession(body: {
  accessToken: string;
  platformRole: "SUPERADMIN";
  user: { id: string; email: string; name: string };
}): PlatformLoginSession {
  return {
    accessToken: body.accessToken,
    userId: body.user.id,
    platformRole: body.platformRole,
    user: body.user
  };
}

export function platformAuthedAgent(
  app: INestApplication,
  session: Pick<PlatformLoginSession, "accessToken">
) {
  const server = app.getHttpServer();
  return {
    get: (url: string) =>
      request(server)
        .get(url)
        .set("Authorization", `Bearer ${session.accessToken}`)
        .set("X-Auth-Scope", "platform"),
    post: (url: string) =>
      request(server)
        .post(url)
        .set("Authorization", `Bearer ${session.accessToken}`)
        .set("X-Auth-Scope", "platform"),
    patch: (url: string) =>
      request(server)
        .patch(url)
        .set("Authorization", `Bearer ${session.accessToken}`)
        .set("X-Auth-Scope", "platform"),
    delete: (url: string) =>
      request(server)
        .delete(url)
        .set("Authorization", `Bearer ${session.accessToken}`)
        .set("X-Auth-Scope", "platform")
  };
}
