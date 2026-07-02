import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const DEFAULT_DIR = join(process.cwd(), ".billing-receipts");

function storageDir(): string {
  return process.env.BILLING_RECEIPTS_DIR?.trim() || DEFAULT_DIR;
}

export async function ensureBillingReceiptStorageDir(): Promise<string> {
  const dir = storageDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeBillingReceiptFile(storageKey: string, buffer: Buffer): Promise<void> {
  const dir = await ensureBillingReceiptStorageDir();
  await writeFile(join(dir, storageKey), buffer);
}

export async function readBillingReceiptFile(storageKey: string): Promise<Buffer> {
  const dir = storageDir();
  return readFile(join(dir, storageKey));
}

export function buildBillingReceiptStorageKey(inquiryId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "bin";
  return `${inquiryId}-${randomUUID()}.${safeExt}`;
}

export const BILLING_RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

export const BILLING_RECEIPT_ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg"
]);

export function extensionForReceiptContentType(contentType: string): string {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
  return "bin";
}
