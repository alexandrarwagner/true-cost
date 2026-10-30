// Shared helpers for the snapshot scripts. Each script writes one versioned JSON file into
// data/snapshots with name, fetchedAt and sourceVersion; nothing overwrites data silently
// outside a reviewed pull request (see .github/workflows/refresh-snapshots.yml).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SNAPSHOT_DIR = join(process.cwd(), "data", "snapshots");

export function loadLocalEnv(): void {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function writeSnapshot(file: string, data: Record<string, unknown>): string {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const path = join(SNAPSHOT_DIR, file);
  // Compact on purpose: these are data files, a third the size of pretty-printed JSON.
  writeFileSync(path, JSON.stringify(data) + "\n");
  return path;
}

export function fetchedAt(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
