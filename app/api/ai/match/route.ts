import { NextResponse } from "next/server";
import { MatchRequestSchema } from "@/lib/schema/ai";
import { aiGate } from "@/lib/server/aiRoute";
import { AppError, errorResponse } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { buildSources } from "@/lib/server/sources";
import { buildAi, matchSchools } from "@/services/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fuzzy school matching, only as a fallback when the real search found nothing. */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { body, ctx } = await aiGate(req, MatchRequestSchema);
    const ai = buildAi();
    if (!ai) throw new AppError("FEATURE_OFF");
    const results = await matchSchools(body.q, ai, buildSources(), ctx);
    return NextResponse.json({ results }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError)
      return errorResponse(
        err.code,
        err.code === "RATE_LIMITED" && err.note ? { "retry-after": err.note } : undefined,
      );
    log.error("ai_match_failed", { error: err instanceof Error ? err.name : "unknown" });
    return errorResponse("INTERNAL");
  }
}
