import type { Request } from "express";

/** Matches frontend NEXT_PUBLIC_AUTH_SCOPE (client | admin | platform). */
export type AuthScope = "client" | "admin" | "platform" | "app";

export function getAuthScope(req: Request): AuthScope {
  const raw = req.headers["x-auth-scope"];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  if (value === "client" || value === "admin" || value === "platform") return value;
  return "app";
}

export function accessCookieName(scope: string): string {
  return scope === "app" ? "access_token" : `access_token_${scope}`;
}

export function refreshCookieName(scope: string): string {
  return scope === "app" ? "refresh_token" : `refresh_token_${scope}`;
}
