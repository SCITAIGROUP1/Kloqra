import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import type { Request } from "express";
import { DomainException } from "../errors/domain.exception";

export function getAllowedFrontendOrigins(): string[] {
  return (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000,http://localhost:3002")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Matches CORS policy — explicit FRONTEND_ORIGIN list plus *.vercel.app previews. */
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
 * Browser requests must send an Origin header matching FRONTEND_ORIGIN.
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
