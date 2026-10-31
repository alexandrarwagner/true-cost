import { NextResponse } from "next/server";
import { CompareRequestSchema } from "@/lib/schema/compare";
import { AppError, errorResponse } from "@/lib/server/errors";
import { flags } from "@/lib/server/flags";
import { log } from "@/lib/server/log";
import { assertSameOrigin, enforceRateLimit, readValidatedBody } from "@/lib/server/request";
import { buildSources } from "@/lib/server/sources";
import { runCompare } from "@/services/compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Up to three schools side by side (step 8). Off by default: COMPARE_ENABLED=false answers 404.
export async function POST(req: Request): Promise<NextResponse> {
  const started = Date.now();
  try {
    assertSameOrigin(req);
    await enforceRateLimit(req, "general");
    if (!flags().COMPARE_ENABLED) throw new AppError("FEATURE_OFF");
    const body = await readValidatedBody(req, CompareRequestSchema);
    const result = await runCompare(body, buildSources());
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError) {
      log.info("compare_rejected", { code: err.code, note: err.note, ms: Date.now() - started });
      return errorResponse(
        err.code,
        err.code === "RATE_LIMITED" && err.note ? { "retry-after": err.note } : undefined,
      );
    }
    log.error("compare_failed", {
      error: err instanceof Error ? err.name : "unknown",
      ms: Date.now() - started,
    });
    return errorResponse("INTERNAL");
  }
}
