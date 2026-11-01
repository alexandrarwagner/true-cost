import "server-only";
import { SAVINGS_MIN_USD } from "@/data/constants";
import { computeEstimate, type EstimateContext } from "@/lib/core/estimate";
import { combinedScenario, LEVERS, leverById, rankLevers } from "@/lib/core/levers";
import type { LeverContext, LeverId, RankedLever } from "@/lib/core/levers";
import type { Estimate, EstimateInput, Minor, SchoolFlags, Totals } from "@/lib/core/types";

// "Ways to lower this number" (step 3). The baseline is ranked once; the levers switched on
// become one combined scenario, which is the estimate the page then shows.

export interface SavingsResult {
  /** Every applicable lever, ranked against the baseline. Tips (no figure) last. */
  levers: RankedLever[];
  /** The levers actually applied: requested, with a figure, and not excluded by an earlier one. */
  active: LeverId[];
  /** The totals before any lever, for the "was" line and the live announcement. */
  baselineTotals: Totals;
  /** The exchange-rate band paying in USD would remove. Absent without a replay. */
  uncertainty?: { lowHome: Minor; highHome: Minor };
}

/** Drop ids that aren't offered and resolve conflicts in canonical order (first one wins). */
export function resolveActive(requested: readonly LeverId[], ranked: RankedLever[]): LeverId[] {
  const offered = new Set(ranked.filter((l) => l.hasFigure).map((l) => l.id));
  const active: LeverId[] = [];
  for (const { id } of LEVERS) {
    if (!requested.includes(id) || !offered.has(id)) continue;
    if (active.some((a) => leverById(a)?.excludes.includes(id))) continue;
    active.push(id);
  }
  return active;
}

export function withSavings(
  input: EstimateInput,
  ctx: EstimateContext,
  requested: readonly LeverId[],
  schoolFlags: SchoolFlags,
): { estimate: Estimate; savings: SavingsResult } {
  const baseline = computeEstimate(input, ctx);
  const leverCtx: LeverContext = { ...ctx, schoolFlags };
  const levers = rankLevers(input, baseline, leverCtx, { thresholdUsd: SAVINGS_MIN_USD });
  const active = resolveActive(requested, levers);
  const estimate =
    active.length > 0 ? combinedScenario(input, active, leverCtx).estimate : baseline;
  const fx = baseline.fx;
  return {
    estimate,
    savings: {
      levers,
      active,
      baselineTotals: baseline.totals,
      ...(fx.kind === "replay"
        ? { uncertainty: { lowHome: fx.best10Home, highHome: fx.worst10Home } }
        : {}),
    },
  };
}
