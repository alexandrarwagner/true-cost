import { NextResponse } from "next/server";
import { ExtractRequestSchema } from "@/lib/schema/ai";
import { aiGate } from "@/lib/server/aiRoute";
import { AppError, errorResponse } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { buildAi } from "@/services/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reads pasted letter text and returns fields with verbatim quotes. Nothing is applied here. */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { body, ctx } = await aiGate(req, ExtractRequestSchema);
    const ai = buildAi();
    if (!ai) throw new AppError("FEATURE_OFF");
    const fields = await ai.extractLetter(body.text, ctx);
    return NextResponse.json(
      { fields: fields ?? [], ok: fields !== null },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof AppError)
      return errorResponse(
        err.code,
        err.code === "RATE_LIMITED" && err.note ? { "retry-after": err.note } : undefined,
      );
    log.error("ai_extract_failed", { error: err instanceof Error ? err.name : "unknown" });
    return errorResponse("INTERNAL");
  }
}
