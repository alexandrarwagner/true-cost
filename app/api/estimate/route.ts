import { NextResponse } from "next/server";
import { EstimateRequestSchema } from "@/lib/schema/estimate";
import { AppError, errorResponse } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { assertSameOrigin, enforceRateLimit, readValidatedBody } from "@/lib/server/request";
import { buildSources, exampleSources } from "@/lib/server/sources";
import { runEstimate } from "@/services/estimate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const started = Date.now();
  try {
    assertSameOrigin(req);
    await enforceRateLimit(req, "general");
    const body = await readValidatedBody(req, EstimateRequestSchema);
    const result = await runEstimate(body, body.example ? exampleSources() : buildSources());
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError) {
      log.info("estimate_rejected", { code: err.code, note: err.note, ms: Date.now() - started });
      return errorResponse(
        err.code,
        err.code === "RATE_LIMITED" && err.note ? { "retry-after": err.note } : undefined,
      );
    }
    log.error("estimate_failed", {
      error: err instanceof Error ? err.name : "unknown",
      ms: Date.now() - started,
    });
    return errorResponse("INTERNAL");
  }
}
