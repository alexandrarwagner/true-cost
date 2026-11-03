import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { assertSameOrigin, enforceRateLimit } from "@/lib/server/request";
import { getTips } from "@/lib/server/tips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Four saving tips for the student's place, from Claude (lib/server/tips.ts), or
 * `{ tips: null }` when the page should keep its hand-written tiles. Same-origin and the
 * general rate tier; answers are cached server-side per place for a day.
 */
const Query = z.object({
  country: z.string().trim().min(2).max(60),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(40).optional(),
  school: z.string().trim().max(200).optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(req);
    await enforceRateLimit(req, "general");
    const url = new URL(req.url);
    const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) throw new AppError("INVALID_INPUT");
    const tips = await getTips(parsed.data);
    return NextResponse.json(
      { tips, generatedBy: tips ? "ai" : "static" },
      { headers: { "cache-control": "private, max-age=3600" } },
    );
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.code);
    log.error("tips_failed", { error: err instanceof Error ? err.name : "unknown" });
    return NextResponse.json({ tips: null, generatedBy: "static" });
  }
}
