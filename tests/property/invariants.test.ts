import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { SOURCE_IDS } from "@/data/sources";
import { evaluate } from "@/lib/core/derive";
import { computeEstimate } from "@/lib/core/estimate";
import { toCents, toMinor, usd } from "@/lib/core/money";
import type { Cents, DegreeYears, EstimateInput } from "@/lib/core/types";
import { INR_HISTORY } from "../fixtures/fxHistory";
import { baseInput, LAFAYETTE_RENT, PURDUE, TODAY } from "../fixtures/inputs";

const fx = {
  today: { date: TODAY, rate: 95.27, source: "Frankfurter blended" },
  history: INR_HISTORY,
  minorDigits: 2,
};

const inputArb: fc.Arbitrary<EstimateInput> = fc
  .record({
    tuition: fc.integer({ min: 0, max: 90_000 }),
    years: fc.constantFrom<DegreeYears>(1, 2, 3, 4),
    season: fc.constantFrom("fall" as const, "spring" as const),
    scholarship: fc.option(fc.integer({ min: 0, max: 100_000 }), { nil: undefined }),
    offCampus: fc.boolean(),
    roommates: fc.integer({ min: 0, max: 3 }),
    bedrooms: fc.constantFrom(0 as const, 1 as const, 2 as const, 3 as const, 4 as const),
    twelve: fc.boolean(),
    trips: fc.integer({ min: 0, max: 3 }),
    dependants: fc.integer({ min: 0, max: 2 }),
    payFromUsd: fc.boolean(),
  })
  .map((r) =>
    baseInput({
      tuitionPerYearUsd: usd(r.tuition),
      degreeYears: r.years,
      startTerm: { year: 2027, season: r.season },
      options: {
        ...(r.scholarship !== undefined ? { scholarshipPerYearUsd: usd(r.scholarship) } : {}),
        housing: r.offCampus
          ? {
              kind: "off_campus",
              bedrooms: r.bedrooms,
              roommates: r.roommates,
              twelveMonthLease: r.twelve,
            }
          : { kind: "on_campus", bedrooms: 1, roommates: 0 },
        flights: { tripsHomePerYear: r.trips },
        dependants: r.dependants,
        payFromUsd: r.payFromUsd,
      },
    }),
  );

describe("estimate invariants", () => {
  it("total ≥ net tuition, categories are non-negative, and the schedule reconciles with the totals", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const e = computeEstimate(input, {
          today: TODAY,
          school: PURDUE,
          rent: LAFAYETTE_RENT,
          fx,
        });
        expect(e.totals.total).toBeGreaterThanOrEqual(e.totals.tuition);
        for (const v of [
          e.totals.tuition,
          e.totals.housing,
          e.totals.healthInsurance,
          e.totals.living,
          e.totals.oneOff,
          e.totals.moneyMoving,
        ])
          expect(v).toBeGreaterThanOrEqual(0);
        const scheduled = e.schedule.reduce((s, ev) => s + ev.amountUsd, 0);
        expect(scheduled).toBe(e.totals.total - e.totals.moneyMoving);
        // Every amount is reproduced by its own derivation, and every source is registered.
        for (const item of e.items) {
          expect(evaluate(item.derivation.formula, item.derivation.terms)).toBe(item.amountUsd);
          expect(SOURCE_IDS).toContain(item.source.id);
        }
        expect(e.moneyMoving.totalUsd).toBe(e.totals.moneyMoving);
        if (e.fx.kind === "replay") {
          expect(e.fx.best.totalHome).toBeLessThanOrEqual(e.fx.medianHome);
          expect(e.fx.medianHome).toBeLessThanOrEqual(e.fx.worst.totalHome);
          expect(e.fx.best10Home).toBeLessThanOrEqual(e.fx.worst10Home);
        }
      }),
      { numRuns: 60 },
    );
  });

  it("currency conversion round-trips within one minor unit", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000_00 }),
        fc.double({ min: 0.5, max: 30_000, noNaN: true }),
        fc.constantFrom(0, 2),
        (amount, rate, digits) => {
          const back = toCents(toMinor(amount as Cents, rate, digits), rate, digits);
          const tolerance = digits === 0 ? Math.ceil(100 / rate) + 1 : 1;
          expect(Math.abs(back - amount)).toBeLessThanOrEqual(tolerance);
        },
      ),
      { numRuns: 200 },
    );
  });
});
