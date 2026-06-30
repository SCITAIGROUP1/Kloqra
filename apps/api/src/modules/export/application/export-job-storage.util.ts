import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";

const DEFAULT_DIR = join(process.cwd(), ".export-jobs");

function storageDir(): string {
  return process.env.EXPORT_STORAGE_DIR?.trim() || DEFAULT_DIR;
}

export async function ensureExportStorageDir(): Promise<string> {
  const dir = storageDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeExportJobFile(storageKey: string, buffer: Buffer): Promise<void> {
  const dir = await ensureExportStorageDir();
  await writeFile(join(dir, storageKey), buffer);
}

export async function readExportJobFile(storageKey: string): Promise<Buffer> {
  const dir = storageDir();
  return readFile(join(dir, storageKey));
}

export async function deleteExportJobFile(storageKey: string): Promise<void> {
  const dir = storageDir();
  await rm(join(dir, storageKey), { force: true });
}

export function buildExportJobStorageKey(jobId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "bin";
  return `${jobId}.${safeExt}`;
}
