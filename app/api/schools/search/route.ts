import { NextResponse } from "next/server";
import { SchoolSearchQuerySchema } from "@/lib/schema/estimate";
import { AppError, errorResponse } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { enforceRateLimit } from "@/lib/server/request";
import { buildSources } from "@/lib/server/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Typeahead over College Scorecard. The query is the only user text that leaves the site. */
export async function GET(req: Request): Promise<NextResponse> {
  const started = Date.now();
  try {
    await enforceRateLimit(req, "general");
    const parsed = SchoolSearchQuerySchema.safeParse({
      q: new URL(req.url).searchParams.get("q") ?? "",
    });
    if (!parsed.success) throw new AppError("INVALID_INPUT", "query");
    const results = await buildSources().schools.search(parsed.data.q, AbortSignal.timeout(5000));
    log.info("school_search", { results: results.length, ms: Date.now() - started });
    return NextResponse.json({ results }, { headers: { "cache-control": "private, max-age=300" } });
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.code);
    log.error("school_search_failed", {
      error: err instanceof Error ? err.name : "unknown",
      ms: Date.now() - started,
    });
    return errorResponse("DATA_UNAVAILABLE");
  }
}
