import { NextResponse } from "next/server";
import { FxLatestQuerySchema } from "@/lib/schema/estimate";
import { AppError, errorResponse } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/request";
import { buildSources } from "@/lib/server/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Today's rate for a currency, with its date and source. */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    await enforceRateLimit(req, "general");
    const parsed = FxLatestQuerySchema.safeParse({
      currency: new URL(req.url).searchParams.get("currency") ?? "",
    });
    if (!parsed.success) throw new AppError("INVALID_INPUT", "query");
    const rate = await buildSources().fx.latest(parsed.data.currency, AbortSignal.timeout(5000));
    if (!rate) throw new AppError("DATA_UNAVAILABLE", "fx");
    return NextResponse.json(rate, { headers: { "cache-control": "private, max-age=300" } });
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.code);
    return errorResponse("DATA_UNAVAILABLE");
  }
}
