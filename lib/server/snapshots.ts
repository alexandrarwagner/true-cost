import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// Versioned JSON snapshots of rarely-changing datasets live in data/snapshots. Each carries
// fetchedAt and sourceVersion, shown in the UI and checked for freshness by /api/health.

const SnapshotMetaSchema = z.object({
  name: z.string(),
  fetchedAt: z.iso.datetime(),
  sourceVersion: z.string(),
});
export type SnapshotMeta = z.infer<typeof SnapshotMetaSchema>;

export const SNAPSHOT_DIR = join(process.cwd(), "data", "snapshots");
export const STALE_AFTER_DAYS = 180;

export function listSnapshots(): Array<SnapshotMeta & { ageDays: number; stale: boolean }> {
  let files: string[];
  try {
    files = readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const now = Date.now();
  const out: Array<SnapshotMeta & { ageDays: number; stale: boolean }> = [];
  for (const f of files) {
    try {
      const parsed = SnapshotMetaSchema.safeParse(
        JSON.parse(readFileSync(join(SNAPSHOT_DIR, f), "utf8")),
      );
      if (!parsed.success) continue;
      const ageDays = Math.floor((now - new Date(parsed.data.fetchedAt).getTime()) / 86_400_000);
      out.push({ ...parsed.data, ageDays, stale: ageDays > STALE_AFTER_DAYS });
    } catch {
      // unreadable snapshot: skipped, reported as absent
    }
  }
  return out;
}
