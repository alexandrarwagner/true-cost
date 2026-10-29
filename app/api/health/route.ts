import { NextResponse } from "next/server";
import { getEnv } from "@/lib/server/env";
import { flags } from "@/lib/server/flags";
import { listSnapshots } from "@/lib/server/snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports configuration and snapshot freshness. Booleans and dates only, never values. */
export function GET(): NextResponse {
  const env = getEnv();
  const snapshots = listSnapshots();
  return NextResponse.json(
    {
      ok: !snapshots.some((s) => s.stale),
      flags: flags(),
      configured: {
        scorecard: env.scorecard.enabled,
        ai: env.ai.enabled,
        turnstile: env.turnstile.enabled,
        rateLimit: env.rateLimit.backend,
      },
      snapshots: snapshots.map((s) => ({
        name: s.name,
        fetchedAt: s.fetchedAt,
        sourceVersion: s.sourceVersion,
        ageDays: s.ageDays,
        stale: s.stale,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
