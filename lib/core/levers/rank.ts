import { computeEstimate } from "../estimate";
import { toMinor } from "../money";
import type { Cents, Estimate, EstimateInput, Minor } from "../types";
import { flightsFewer } from "./flights";
import { housingOnCampus, lease12vs9, roommates1, roommates2 } from "./housing";
import { insuranceWaiver, transferMarkup, transfersFewer } from "./money";
import type { Lever, LeverContext, LeverId, RankedLever, RankOptions, Scenario } from "./types";

/** Canonical order; combined scenarios apply levers in this order, whatever the user's. */
export const LEVERS: readonly Lever[] = [
  housingOnCampus,
  roommates1,
  roommates2,
  lease12vs9,
  insuranceWaiver,
  transfersFewer,
  transferMarkup,
  flightsFewer,
];

export const leverById = (id: LeverId): Lever | undefined => LEVERS.find((l) => l.id === id);

function homeFrom(saving: Cents, baseline: Estimate, ctx: LeverContext): Minor | undefined {
  if (!ctx.fx || baseline.input.homeCurrency === "USD" || baseline.input.options.payFromUsd)
    return undefined;
  return toMinor(saving, ctx.fx.today.rate, ctx.fx.minorDigits);
}

/**
 * Every lever that applies, each re-run as its own scenario against the same context. Figures
 * below the threshold are dropped; tips (no figure) sort last. Nothing here adds savings up.
 */
export function rankLevers(
  input: EstimateInput,
  baseline: Estimate,
  ctx: LeverContext,
  opts: RankOptions,
): RankedLever[] {
  const out: RankedLever[] = [];
  for (const lever of LEVERS) {
    if (!lever.applies(input, ctx)) continue;
    const common = {
      id: lever.id,
      confidence: lever.confidence(input, ctx),
      noteId: lever.noteId(input, ctx),
      excludes: lever.excludes,
    };
    if (!lever.hasFigure(input, ctx)) {
      out.push({ ...common, savingUsd: 0 as Cents, hasFigure: false });
      continue;
    }
    const scenario = computeEstimate(lever.apply(input, input), ctx);
    const savingUsd = (baseline.totals.total - scenario.totals.total) as Cents;
    if (savingUsd <= opts.thresholdUsd) continue;
    const savingHome = homeFrom(savingUsd, baseline, ctx);
    out.push({
      ...common,
      savingUsd,
      ...(savingHome !== undefined ? { savingHome } : {}),
      hasFigure: true,
    });
  }
  return out.sort((a, b) =>
    a.hasFigure !== b.hasFigure ? (a.hasFigure ? -1 : 1) : b.savingUsd - a.savingUsd,
  );
}

/** The inputs with the given levers applied in canonical order, each against the baseline. */
export function applyLevers(baseline: EstimateInput, ids: readonly LeverId[]): EstimateInput {
  const wanted = new Set(ids);
  return LEVERS.filter((l) => wanted.has(l.id)).reduce(
    (input, l) => l.apply(input, baseline),
    baseline,
  );
}

/** One combined scenario for the levers switched on. Never a sum. */
export function combinedScenario(
  baseline: EstimateInput,
  ids: readonly LeverId[],
  ctx: LeverContext,
): Scenario {
  const input = applyLevers(baseline, ids);
  return { input, estimate: computeEstimate(input, ctx) };
}
