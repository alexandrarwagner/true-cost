import { NextResponse } from "next/server";
import { ContextQuerySchema } from "@/lib/schema/context";
import { AppError, errorResponse } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { enforceRateLimit } from "@/lib/server/request";
import { buildSources } from "@/lib/server/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;

/**
 * What the browser engine needs for one school: its published costs (College Scorecard) and
 * the rent for its area (HUD). The keys stay here. A source that fails comes back null and
 * the engine labels that line as an estimate, as the server-side estimate does.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const started = Date.now();
  try {
    await enforceRateLimit(req, "general");
    const params = new URL(req.url).searchParams;
    const parsed = ContextQuerySchema.safeParse({
      unitId: params.get("unitId") ?? "",
      zip: params.get("zip") ?? "",
      state: params.get("state") ?? "",
      city: params.get("city") ?? "",
    });
    if (!parsed.success) throw new AppError("INVALID_INPUT", "query");
    const q = parsed.data;
    const sources = buildSources();
    const [school, rent] = await Promise.allSettled([
      sources.schools.costs(q.unitId, AbortSignal.timeout(TIMEOUT_MS)),
      sources.rent.forArea(
        { zip: q.zip, state: q.state, city: q.city },
        AbortSignal.timeout(TIMEOUT_MS),
      ),
    ]);
    const body = {
      school: school.status === "fulfilled" ? (school.value?.costs ?? null) : null,
      rent: rent.status === "fulfilled" ? rent.value : null,
      demo: sources.demo,
      fetchedAt: new Date().toISOString(),
    };
    log.info("context", {
      school: body.school ? "ok" : "missing",
      rent: body.rent ? "ok" : "missing",
      ms: Date.now() - started,
    });
    return NextResponse.json(body, { headers: { "cache-control": "private, max-age=3600" } });
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.code);
    log.error("context_failed", {
      error: err instanceof Error ? err.name : "unknown",
      ms: Date.now() - started,
    });
    return errorResponse("DATA_UNAVAILABLE");
  }
}
