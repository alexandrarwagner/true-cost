import { NextResponse } from "next/server";
import { z } from "zod";
import { savingOverDegree } from "@/lib/core/deals";
import type { DegreeYears } from "@/lib/core/types";
import { dealsFor } from "@/lib/server/deals";
import { AppError, errorResponse } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { enforceRateLimit } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.strictObject({
  unitId: z.coerce.number().int().min(0).max(99_999_999),
  city: z.string().trim().max(80),
  state: z.string().trim().max(2),
  years: z.coerce.number().int().min(1).max(6),
});

/**
 * The student deals the page shows: the school's own file, its city's and the national
 * ones, every one approved by a person and still fresh (ADR 014). Each carries the saving
 * over the degree in US cents when the source states both prices.
 */
export function GET(req: Request): Promise<NextResponse> {
  const started = Date.now();
  return enforceRateLimit(req, "general")
    .then(() => {
      const p = new URL(req.url).searchParams;
      const parsed = Query.safeParse({
        unitId: p.get("unitId") ?? "0",
        city: p.get("city") ?? "",
        state: p.get("state") ?? "",
        years: p.get("years") ?? "4",
      });
      if (!parsed.success) throw new AppError("INVALID_INPUT", "query");
      const q = parsed.data;
      const today = new Date().toISOString().slice(0, 10);
      const found = dealsFor(
        { unitId: q.unitId, name: "", city: q.city, state: q.state, zip: "" },
        today,
      );
      const deals = found.deals.map((d) => ({
        ...d,
        savingUsd: savingOverDegree(d, q.years as DegreeYears) ?? null,
      }));
      log.info("deals", { count: deals.length, ms: Date.now() - started });
      return NextResponse.json(
        { deals, schoolChecked: found.schoolChecked, schoolLink: found.schoolLink ?? null },
        { headers: { "cache-control": "private, max-age=3600" } },
      );
    })
    .catch((err: unknown) => {
      if (err instanceof AppError) return errorResponse(err.code);
      log.error("deals_failed", { error: err instanceof Error ? err.name : "unknown" });
      return errorResponse("DATA_UNAVAILABLE");
    });
}
