import type { PrismaClient } from "../../../prisma/generated/client";
import type { PrismaService } from "./prisma.service";

type GeneratedPrismaSource =
  | PrismaService
  | PrismaClient
  | Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/** Tenant SaaS models live on the generated Prisma client (custom output path). */
export function generatedPrisma(prisma: GeneratedPrismaSource): PrismaClient {
  return prisma as unknown as PrismaClient;
}
