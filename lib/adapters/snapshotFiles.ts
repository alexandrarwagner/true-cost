import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";

// Reads a versioned JSON snapshot from data/snapshots, validated against a schema.
// Missing or malformed files return null so the adapter can fall back to a live call.

const DIR = join(process.cwd(), "data", "snapshots");
const cache = new Map<string, { mtime: number; value: unknown }>();

export function readSnapshot<S extends z.ZodType>(file: string, schema: S): z.infer<S> | null {
  const path = join(DIR, file);
  try {
    const raw = readFileSync(path, "utf8");
    const key = `${path}:${raw.length}`;
    const hit = cache.get(key);
    if (hit) return hit.value as z.infer<S>;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    cache.set(key, { mtime: Date.now(), value: parsed.data });
    return parsed.data as z.infer<S>;
  } catch {
    return null;
  }
}
