import type { CookieOptions } from "express";

type SameSiteValue = "lax" | "strict" | "none";

function parseSameSite(raw: string | undefined): SameSiteValue | null {
  const v = raw?.trim().toLowerCase();
  if (v === "lax" || v === "strict" || v === "none") return v;
  return null;
}

function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return "localhost";
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  return parts.slice(-2).join(".");
}

function parseOriginHost(origin: string): string | null {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

/** True when any FRONTEND_ORIGIN host differs from the API host registrable domain. */
export function isCrossSiteFrontendSetup(): boolean {
  const apiHost = process.env.RAILWAY_PUBLIC_DOMAIN?.trim() || process.env.API_PUBLIC_HOST?.trim();
  const origins = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.length === 0) return false;

  const apiReg = apiHost ? registrableDomain(apiHost) : null;
  for (const origin of origins) {
    const host = parseOriginHost(origin);
    if (!host) continue;
    const frontReg = registrableDomain(host);
    if (apiReg && frontReg !== apiReg) return true;
    if (!apiReg && (host.includes("vercel.app") || host.includes("railway.app"))) {
      return true;
    }
  }
  return false;
}

export function resolveAuthCookieSameSite(): SameSiteValue {
  const explicit = parseSameSite(process.env.AUTH_COOKIE_SAME_SITE);
  if (explicit) return explicit;

  if (process.env.NODE_ENV === "production" && isCrossSiteFrontendSetup()) {
    return "none";
  }
  return "lax";
}

export function resolveAuthCookieSecure(sameSite: SameSiteValue): boolean {
  const raw = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (sameSite === "none") return true;
  return process.env.NODE_ENV === "production";
}

export function getAuthCookieDomain(): string | undefined {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  return domain || undefined;
}

export function getCookieOpts(): CookieOptions {
  const sameSite = resolveAuthCookieSameSite();
  const secure = resolveAuthCookieSecure(sameSite);
  const domain = getAuthCookieDomain();
  return {
    httpOnly: true,
    sameSite,
    secure,
    path: "/",
    ...(sameSite === "none" ? { partitioned: true } : {}),
    ...(domain ? { domain } : {})
  };
}

export function getClearCookieOpts(): Pick<
  CookieOptions,
  "domain" | "sameSite" | "secure" | "path" | "partitioned"
> {
  const sameSite = resolveAuthCookieSameSite();
  const secure = resolveAuthCookieSecure(sameSite);
  const domain = getAuthCookieDomain();
  return {
    sameSite,
    secure,
    path: "/",
    ...(sameSite === "none" ? { partitioned: true } : {}),
    ...(domain ? { domain } : {})
  };
}

function failStartup(message: string): never {
  console.error(`\n╔══════════════════════════════════════════════════════╗`);
  console.error(`║     STARTUP FAILED — Auth cookie configuration         ║`);
  console.error(`╚══════════════════════════════════════════════════════╝\n`);
  console.error(message);
  process.exit(1);
}

export function validateProductionCookieConfig(): void {
  if (process.env.NODE_ENV !== "production") return;

  const origins = (process.env.FRONTEND_ORIGIN ?? "").trim();
  if (!origins) {
    failStartup("FRONTEND_ORIGIN is required in production (comma-separated Vercel URLs).");
  }

  const sameSite = resolveAuthCookieSameSite();
  const crossSite = isCrossSiteFrontendSetup();

  if (crossSite && sameSite !== "none") {
    failStartup(
      "Cross-site Vercel + Railway detected but AUTH_COOKIE_SAME_SITE is not 'none'. " +
        "Set AUTH_COOKIE_SAME_SITE=none and AUTH_COOKIE_SECURE=true on Railway."
    );
  }

  if (sameSite === "none" && !resolveAuthCookieSecure("none")) {
    failStartup("SameSite=none requires AUTH_COOKIE_SECURE=true.");
  }

  if (crossSite && process.env.COOKIE_DOMAIN?.trim()) {
    failStartup(
      "Do not set COOKIE_DOMAIN for cross-site Vercel + Railway — cookies must be host-only on the API domain."
    );
  }
}
