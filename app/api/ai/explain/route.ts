import { NextResponse } from "next/server";
import { templateExplanation } from "@/lib/adapters/ai/validate";
import { ExplainRequestSchema } from "@/lib/schema/ai";
import { aiGate } from "@/lib/server/aiRoute";
import { AppError, errorResponse } from "@/lib/server/errors";
import { flags } from "@/lib/server/flags";
import { log } from "@/lib/server/log";
import { assertSameOrigin, enforceRateLimit, readValidatedBody } from "@/lib/server/request";
import { buildSources } from "@/lib/server/sources";
import { buildAi, explainInputFrom } from "@/services/ai";
import { runEstimate } from "@/services/estimate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A plain-English explanation of an estimate, recomputed server-side from the inputs so the
 * numbers can't be tampered with. Falls back to a template when AI is off or fails.
 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    let body;
    let ctx = { signal: AbortSignal.timeout(12_000), requestId: crypto.randomUUID() };
    if (flags().AI_ENABLED) {
      ({ body, ctx } = await aiGate(req, ExplainRequestSchema));
    } else {
      assertSameOrigin(req);
      await enforceRateLimit(req, "general");
      body = await readValidatedBody(req, ExplainRequestSchema);
    }
    const response = await runEstimate(body.request, buildSources());
    const input = explainInputFrom(response);
    const ai = buildAi();
    const text = ai ? await ai.explain(input, ctx) : templateExplanation(input);
    const generatedBy = ai && text !== templateExplanation(input) ? "ai" : "template";
    return NextResponse.json({ text, generatedBy }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError)
      return errorResponse(
        err.code,
        err.code === "RATE_LIMITED" && err.note ? { "retry-after": err.note } : undefined,
      );
    log.error("ai_explain_failed", { error: err instanceof Error ? err.name : "unknown" });
    return errorResponse("INTERNAL");
  }
}
