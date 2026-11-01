import type { Deal } from "../deals";
import { computeEstimate } from "../estimate";
import { toMinor } from "../money";
import type { Cents, Estimate, EstimateInput, Minor } from "../types";
import { dealLever } from "./deals";
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

/** The built-in levers, then one per deal, in canonical order. */
export const allLevers = (deals: readonly Deal[] = []): Lever[] => [
  ...LEVERS,
  ...deals.map(dealLever),
];

export const leverById = (id: LeverId, deals: readonly Deal[] = []): Lever | undefined =>
  allLevers(deals).find((l) => l.id === id);

function homeFrom(saving: Cents, baseline: Estimate, ctx: LeverContext): Minor | undefined {
  if (!ctx.fx || baseline.input.homeCurrency === "USD" || baseline.input.options.payFromUsd)
    return undefined;
  return toMinor(saving, ctx.fx.today.rate, ctx.fx.minorDigits);
}

/**
 * Every lever that applies, each re-run as its own scenario against the same context. Figures
 * below the threshold are dropped; tips (no figure) sort last. Deals always show: with a
 * figure when the re-run saves anything, as a tip otherwise. Nothing here adds savings up.
 */
export function rankLevers(
  input: EstimateInput,
  baseline: Estimate,
  ctx: LeverContext,
  opts: RankOptions,
): RankedLever[] {
  const out: RankedLever[] = [];
  const deals = ctx.deals ?? [];
  for (const lever of allLevers(deals)) {
    if (!lever.applies(input, ctx)) continue;
    const deal = deals.find((d) => lever.id === `deal:${d.id}`);
    const common = {
      id: lever.id,
      confidence: lever.confidence(input, ctx),
      noteId: lever.noteId(input, ctx),
      excludes: lever.excludes,
      ...(deal ? { deal } : {}),
    };
    const tip = { ...common, savingUsd: 0 as Cents, hasFigure: false };
    if (!lever.hasFigure(input, ctx)) {
      out.push(tip);
      continue;
    }
    const scenario = computeEstimate(lever.apply(input, input), ctx);
    const savingUsd = (baseline.totals.total - scenario.totals.total) as Cents;
    const floor = lever.kind === "deal" ? 0 : opts.thresholdUsd;
    if (savingUsd <= floor) {
      if (lever.kind === "deal") out.push(tip);
      continue;
    }
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
export function applyLevers(
  baseline: EstimateInput,
  ids: readonly LeverId[],
  deals: readonly Deal[] = [],
): EstimateInput {
  const wanted = new Set(ids);
  return allLevers(deals)
    .filter((l) => wanted.has(l.id))
    .reduce((input, l) => l.apply(input, baseline), baseline);
}

/** One combined scenario for the levers switched on. Never a sum. */
export function combinedScenario(
  baseline: EstimateInput,
  ids: readonly LeverId[],
  ctx: LeverContext,
): Scenario {
  const input = applyLevers(baseline, ids, ctx.deals);
  return { input, estimate: computeEstimate(input, ctx) };
}
