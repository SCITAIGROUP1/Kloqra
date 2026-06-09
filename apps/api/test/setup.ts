import "reflect-metadata";
import { loadPrismaEnvFile, normalizeEnvQuotes } from "../src/load-env";

normalizeEnvQuotes();
loadPrismaEnvFile();
