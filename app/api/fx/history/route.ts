import { NextResponse } from "next/server";
import { FxHistoryQuerySchema } from "@/lib/schema/context";
import { AppError, errorResponse } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { enforceRateLimit } from "@/lib/server/request";
import { buildSources } from "@/lib/server/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;

/**
 * Today's rate and the daily history for one currency, for the browser engine's exchange-rate
 * replay. The same adapters as the server-side estimate, so both see the same rates
 * (fixtures in DEMO_MODE, the Frankfurter snapshot otherwise). About 35 KB compressed.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const started = Date.now();
  try {
    await enforceRateLimit(req, "general");
    const parsed = FxHistoryQuerySchema.safeParse({
      currency: new URL(req.url).searchParams.get("currency") ?? "",
    });
    if (!parsed.success) throw new AppError("INVALID_INPUT", "query");
    const { currency } = parsed.data;
    const fx = buildSources().fx;
    const [today, history] = await Promise.allSettled([
      fx.latest(currency, AbortSignal.timeout(TIMEOUT_MS)),
      currency === "USD"
        ? Promise.resolve([])
        : fx.history(currency, AbortSignal.timeout(TIMEOUT_MS)),
    ]);
    const body = {
      today: today.status === "fulfilled" ? today.value : null,
      history: history.status === "fulfilled" ? history.value : [],
    };
    log.info("fx_history", { currency, points: body.history.length, ms: Date.now() - started });
    return NextResponse.json(body, { headers: { "cache-control": "private, max-age=86400" } });
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.code);
    log.error("fx_history_failed", {
      error: err instanceof Error ? err.name : "unknown",
      ms: Date.now() - started,
    });
    return errorResponse("DATA_UNAVAILABLE");
  }
}
