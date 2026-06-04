import type { Request } from "express";

/** Matches frontend NEXT_PUBLIC_AUTH_SCOPE (client | admin). */
export function getAuthScope(req: Request): string {
  const raw = req.headers["x-auth-scope"];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  if (value === "client" || value === "admin") return value;
  return "app";
}

export function accessCookieName(scope: string): string {
  return scope === "app" ? "access_token" : `access_token_${scope}`;
}

export function refreshCookieName(scope: string): string {
  return scope === "app" ? "refresh_token" : `refresh_token_${scope}`;
}
