import { costLineOf, savingOverDegree, type Deal } from "../deals";
import type { Deduction } from "../types";
import { withOptions } from "./common";
import { DEAL_LEVER_PREFIX, type DealLeverId, type Lever } from "./types";

// A deal as a lever: switching it on takes the source's stated saving off the matching cost
// line, and the engine re-runs. The figure the page shows is the re-run's difference, which
// the line's own total caps (ADR 014).

export const dealLeverId = (deal: Deal): DealLeverId => `${DEAL_LEVER_PREFIX}${deal.id}`;

export function dealLever(deal: Deal): Lever {
  const id = dealLeverId(deal);
  const line = costLineOf(deal);
  const hasFigure = (years: Parameters<Lever["apply"]>[0]["degreeYears"]) =>
    line !== undefined && savingOverDegree(deal, years) !== undefined;
  return {
    id,
    kind: "deal",
    excludes: [],
    applies: () => true,
    hasFigure: (i) => hasFigure(i.degreeYears),
    apply: (i, baseline) => {
      const amountUsd = savingOverDegree(deal, baseline.degreeYears);
      if (line === undefined || amountUsd === undefined) return i;
      const mine: Deduction = { id: deal.id, lineId: line, amountUsd };
      const others = (i.options.deductions ?? []).filter((d) => d.id !== deal.id);
      return withOptions(i, { deductions: [...others, mine] });
    },
    // The price is the source's own, not ours; the row shows "Checked on" instead of a badge.
    confidence: () => "user",
    noteId: () => "deal",
  };
}
