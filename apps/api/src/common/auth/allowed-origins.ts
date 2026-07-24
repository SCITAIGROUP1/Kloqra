import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import type { Request } from "express";
import { DomainException } from "../errors/domain.exception";

const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004"
] as const;

function originsFromEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function getAllowedFrontendOrigins(): string[] {
  const customOrigins = [
    ...originsFromEnv(process.env.PUBLIC_CLIENT_URL),
    ...originsFromEnv(process.env.PUBLIC_ADMIN_URL),
    ...originsFromEnv(process.env.PUBLIC_PLATFORM_URL)
  ];

  // Production: only explicitly configured app URLs (plus *.vercel.app in isAllowedBrowserOrigin).
  if (process.env.NODE_ENV === "production") {
    return Array.from(new Set(customOrigins));
  }

  // Dev/test: merge env URLs with localhost defaults so a partial .env
  // (e.g. only PUBLIC_ADMIN_URL) does not lock out client/platform CORS.
  return Array.from(new Set([...LOCAL_DEV_ORIGINS, ...customOrigins]));
}

/** Matches CORS policy — explicit dedicated URLs list plus *.vercel.app previews. */
export function isAllowedBrowserOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = getAllowedFrontendOrigins();
  if (allowed.includes(origin)) return true;
  try {
    return new URL(origin).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

/**
 * CSRF mitigation for cookie-auth endpoints when SameSite=None (cross-site).
 * Browser requests must send an Origin header matching allowed frontend origins.
 */
export function assertAllowedAuthOrigin(req: Request): void {
  if (process.env.NODE_ENV !== "production") return;

  const origin = req.headers.origin;
  if (!origin) {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      "Origin header required for auth requests",
      HttpStatus.FORBIDDEN
    );
  }

  if (!isAllowedBrowserOrigin(origin)) {
    throw new DomainException(ErrorCodes.FORBIDDEN, "Origin not allowed", HttpStatus.FORBIDDEN);
  }
}
