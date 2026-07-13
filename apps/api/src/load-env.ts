import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const ENV_KEYS_TO_NORMALIZE = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "PUBLIC_CLIENT_URL",
  "PUBLIC_ADMIN_URL",
  "PUBLIC_PLATFORM_URL"
] as const;

/** Railway Raw Editor paste sometimes includes wrapping "quotes" — strip them. */
export function normalizeEnvQuotes(): void {
  for (const key of ENV_KEYS_TO_NORMALIZE) {
    const raw = process.env[key];
    if (!raw) continue;
    const trimmed = raw.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      process.env[key] = trimmed.slice(1, -1);
    }
  }
}

/** Load DATABASE_URL from prisma/.env (written by docker-entrypoint when Railway injects it). */
export function loadPrismaEnvFile(): void {
  if (process.env.DATABASE_URL?.trim()) return;

  const envPath = resolve(__dirname, "../prisma/.env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== "DATABASE_URL") continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env.DATABASE_URL = value;
    return;
  }
}

export function logMissingProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  for (const key of ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
    if (!process.env[key]?.trim()) {
      console.error(`WARN: ${key} is not set — auth and database routes will fail.`);
    }
  }
  const db = process.env.DATABASE_URL?.trim();
  if (db?.startsWith('"') || db?.startsWith("'")) {
    console.error(
      'WARN: DATABASE_URL still has quote characters — remove wrapping quotes in Railway Variables (value only, no ").'
    );
  }
  if (db) {
    try {
      const host = new URL(db).hostname;
      console.log(`Database host: ${host}`);
    } catch {
      console.error("WARN: DATABASE_URL is not a valid URL after normalization.");
    }
  }
}

/**
 * Zod-based startup validation of required environment variables.
 * Call this early in bootstrap (after normalizeEnvQuotes + loadPrismaEnvFile).
 * Exits the process with exit code 1 and a clear diff of missing/invalid vars.
 */
const requiredEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL must not be empty")
    .url("DATABASE_URL must be a valid URL"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters")
});

const optionalEnvSchema = z.object({
  PORT: z.string().regex(/^\d+$/, "PORT must be a number").optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  REDIS_URL: z.string().optional(),
  REDIS_USE_MEMORY: z.enum(["true", "false"]).optional(),
  PUBLIC_CLIENT_URL: z.string().optional(),
  PUBLIC_ADMIN_URL: z.string().optional(),
  PUBLIC_PLATFORM_URL: z.string().optional(),
  JWT_ACCESS_EXPIRES: z.string().optional(),
  JWT_REFRESH_EXPIRES: z.string().optional(),
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  REFRESH_ROTATION_GRACE_MS: z
    .string()
    .regex(/^\d+$/, "REFRESH_ROTATION_GRACE_MS must be a number")
    .optional(),
  ENABLE_SWAGGER: z.enum(["true", "false"]).optional(),
  // Optional SMTP email delivery (used by ExportScheduleService)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/, "SMTP_PORT must be a number").optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  ASSISTANT_SERVICE_URL: z.string().url().optional(),
  ASSISTANT_INTERNAL_SECRET: z.string().optional(),
  ASSISTANT_ENABLED: z.enum(["true", "false"]).optional(),
  CLIENT_COMMERCIAL_FEATURES_ENABLED: z.enum(["true", "false"]).optional()
});

export function validateRequiredEnv(): void {
  // Skip strict validation in test environments
  if (process.env.NODE_ENV === "test") return;

  const result = requiredEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `  ✗ ${e.path.join(".")}: ${e.message}`);
    console.error("\n╔══════════════════════════════════════════════════════╗");
    console.error("║     STARTUP FAILED — Missing/invalid environment vars  ║");
    console.error("╚══════════════════════════════════════════════════════╝");
    console.error("\nThe following environment variables are required but missing or invalid:");
    console.error(errors.join("\n"));
    console.error("\nCopy apps/api/.env.example to apps/api/.env and fill in all values.\n");
    process.exit(1);
  }

  // Warn about optional but recommended vars
  const optResult = optionalEnvSchema.safeParse(process.env);
  if (!optResult.success) {
    for (const e of optResult.error.errors) {
      console.warn(`ENV WARN: ${e.path.join(".")}: ${e.message}`);
    }
  }
}
