import "server-only";
import { anthropicAi } from "@/lib/adapters/ai/anthropic";
import { mockAi } from "@/lib/adapters/ai/mock";
import type { AiContext, AiService, ExplainInput } from "@/lib/adapters/ai/types";
import type { DataSources, SchoolSummary } from "@/lib/adapters/types";
import { getEnv } from "@/lib/server/env";
import { home, homeShort, monthYear, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "./estimate";

let instance: AiService | null | undefined;

/** The AI service for this deployment: null when AI_ENABLED is off, the mock in DEMO_MODE. */
export function buildAi(): AiService | null {
  if (instance !== undefined) return instance;
  const env = getEnv();
  if (!env.ai.enabled) instance = null;
  else if (env.isDemo || !env.ai.apiKey) instance = mockAi;
  else instance = anthropicAi({ apiKey: env.ai.apiKey, model: env.ai.model });
  return instance;
}

/** The only numbers the explanation may use, pre-formatted so the model copies them verbatim. */
export function explainInputFrom(r: EstimateResponse): ExplainInput {
  const e = r.estimate;
  const fx = e.fx;
  const years = e.input.degreeYears;
  return {
    school: e.input.school.name,
    currency: r.currency.code,
    years: `${years} ${years === 1 ? "year" : "years"}`,
    totalUsd: usdFmt(e.totals.total),
    tuitionUsd: usdFmt(e.totals.tuition),
    hiddenPercent: `${e.totals.hiddenPercentOfTuition}%`,
    baselineHome:
      fx.kind === "replay"
        ? homeShort(fx.baselineHome, r.currency)
        : fx.baselineHome !== undefined && r.currency.code !== "USD"
          ? home(fx.baselineHome, r.currency)
          : null,
    best10Home: fx.kind === "replay" ? homeShort(fx.best10Home, r.currency) : null,
    worst10Home: fx.kind === "replay" ? homeShort(fx.worst10Home, r.currency) : null,
    worstPeriod:
      fx.kind === "replay" ? `${monthYear(fx.worst.start)} to ${monthYear(fx.worst.end)}` : null,
  };
}

/**
 * Fallback school matching: ask the model for likely official names, then resolve each one
 * through the real search so every result carries a genuine Scorecard UNITID.
 */
export async function matchSchools(
  query: string,
  ai: AiService,
  sources: DataSources,
  ctx: AiContext,
): Promise<SchoolSummary[]> {
  const names = await ai.suggestSchools(query, ctx);
  const out: SchoolSummary[] = [];
  const seen = new Set<number>();
  for (const name of names) {
    let results: SchoolSummary[] = [];
    try {
      results = await sources.schools.search(name, AbortSignal.timeout(4500));
    } catch {
      continue;
    }
    for (const r of results.slice(0, 2)) {
      if (!seen.has(r.unitId)) {
        seen.add(r.unitId);
        out.push(r);
      }
    }
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}
