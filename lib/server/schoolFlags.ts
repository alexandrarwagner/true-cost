import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { SchoolFlags } from "@/lib/core/types";

// Hand-checked facts per school that no API provides, keyed by UNITID. Only the owner edits
// this file; a bad entry fails loudly at startup rather than silently enabling a lever.

export const SchoolFlagsSchema = z.record(
  z.string().regex(/^\d+$/),
  z.strictObject({
    waiverAllowed: z.boolean(),
    sourceUrl: z.url().startsWith("https://"),
    checkedOn: z.iso.date(),
  }),
);

let cached: SchoolFlags | undefined;

export function schoolFlags(): SchoolFlags {
  if (cached) return cached;
  const raw = readFileSync(join(process.cwd(), "data", "school-flags.json"), "utf8");
  cached = SchoolFlagsSchema.parse(JSON.parse(raw));
  return cached;
}
