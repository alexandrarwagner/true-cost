import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { SAVINGS_MIN_USD } from "@/data/constants";
import { computeEstimate } from "@/lib/core/estimate";
import { applyLevers, combinedScenario, LEVERS, rankLevers } from "@/lib/core/levers";
import type { LeverContext, LeverId } from "@/lib/core/levers";
import { usd } from "@/lib/core/money";
import type { DegreeYears, EstimateInput } from "@/lib/core/types";
import { INR_HISTORY } from "../fixtures/fxHistory";
import { baseInput, LAFAYETTE_RENT, PURDUE, TODAY } from "../fixtures/inputs";

const ctx: LeverContext = {
  today: TODAY,
  school: PURDUE,
  rent: LAFAYETTE_RENT,
  fx: { today: { date: TODAY, rate: 95.27, source: "x" }, history: INR_HISTORY, minorDigits: 2 },
  schoolFlags: { "243780": { waiverAllowed: true, sourceUrl: "https://x", checkedOn: TODAY } },
};
const opts = { thresholdUsd: SAVINGS_MIN_USD };

const inputArb: fc.Arbitrary<EstimateInput> = fc
  .record({
    tuition: fc.integer({ min: 0, max: 90_000 }),
    years: fc.constantFrom<DegreeYears>(1, 2, 3, 4),
    offCampus: fc.boolean(),
    roommates: fc.integer({ min: 0, max: 3 }),
    bedrooms: fc.constantFrom(0 as const, 1 as const, 2 as const, 3 as const, 4 as const),
    twelve: fc.boolean(),
    knownRent: fc.option(fc.integer({ min: 300, max: 4000 }), { nil: undefined }),
    trips: fc.integer({ min: 0, max: 3 }),
    dependants: fc.integer({ min: 0, max: 2 }),
    payFromUsd: fc.boolean(),
    markup: fc.integer({ min: 0, max: 400 }),
    fee: fc.integer({ min: 0, max: 40 }),
    ownPremium: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
  })
  .map((r) =>
    baseInput({
      tuitionPerYearUsd: usd(r.tuition),
      degreeYears: r.years,
      options: {
        housing: r.offCampus
          ? {
              kind: "off_campus",
              bedrooms: r.bedrooms,
              roommates: r.roommates,
              twelveMonthLease: r.twelve,
              ...(r.knownRent !== undefined ? { monthlyRentUsd: usd(r.knownRent) } : {}),
            }
          : { kind: "on_campus", bedrooms: 1, roommates: 0 },
        flights: { tripsHomePerYear: r.trips },
        dependants: r.dependants,
        payFromUsd: r.payFromUsd,
        transfer: { markupBps: r.markup, fixedFeeUsd: usd(r.fee) },
        ...(r.ownPremium !== undefined
          ? { insurance: { kind: "school_plan", ownPremiumPerYearUsd: usd(r.ownPremium) } }
          : {}),
      },
    }),
  );

/** A subset of the ranked figures with no two that exclude each other. */
function compatibleSubset(ids: LeverId[], picks: boolean[]): LeverId[] {
  const out: LeverId[] = [];
  ids.forEach((id, i) => {
    if (!picks[i]) return;
    const lever = LEVERS.find((l) => l.id === id);
    if (out.some((o) => lever?.excludes.includes(o))) return;
    out.push(id);
  });
  return out;
}

describe("lever invariants", () => {
  it("every shown figure beats the threshold; applying twice equals once", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const baseline = computeEstimate(input, ctx);
        const ranked = rankLevers(input, baseline, ctx, opts);
        for (const l of ranked) {
          if (l.hasFigure) expect(l.savingUsd).toBeGreaterThan(SAVINGS_MIN_USD);
          else expect(l.savingUsd).toBe(0);
          const lever = LEVERS.find((x) => x.id === l.id);
          if (!lever) throw new Error(l.id);
          const once = lever.apply(input, input);
          expect(lever.apply(once, input)).toEqual(once);
        }
      }),
      { numRuns: 40 },
    );
  });

  it("a combined scenario never beats the sum of its parts, and its total stays non-negative", () => {
    fc.assert(
      fc.property(
        inputArb,
        fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }),
        (input, picks) => {
          const baseline = computeEstimate(input, ctx);
          const figures = rankLevers(input, baseline, ctx, opts).filter((l) => l.hasFigure);
          const chosen = compatibleSubset(
            figures.map((l) => l.id),
            picks,
          );
          const combined = combinedScenario(input, chosen, ctx);
          const sum = figures
            .filter((l) => chosen.includes(l.id))
            .reduce((s, l) => s + l.savingUsd, 0);
          const saving = baseline.totals.total - combined.estimate.totals.total;
          expect(combined.estimate.totals.total).toBeGreaterThanOrEqual(0);
          // Two allowances, both from fees being charged per transfer. Each transfer's markup rounds
          // to a cent. And whether two payments share a transfer depends on their dates: once rent
          // is batched per semester, a trip-home flight that used to share January's transfer stands
          // alone, so removing it then also removes a fixed fee. Beyond the fee per event, a
          // combination never beats its parts.
          const fee = input.options.transfer?.fixedFeeUsd ?? 0;
          const feeAllowance = chosen.includes("transfers-fewer")
            ? fee * baseline.schedule.length
            : 0;
          expect(saving).toBeLessThanOrEqual(sum + baseline.schedule.length + feeAllowance);
          if (chosen.length > 0) expect(saving).toBeGreaterThan(0);
          // Duplicate ids (a hand-edited URL) change nothing: targets come from the baseline.
          expect(applyLevers(input, [...chosen, ...chosen])).toEqual(applyLevers(input, chosen));
        },
      ),
      { numRuns: 40 },
    );
  });
});
