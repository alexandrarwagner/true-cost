import { describe, expect, it } from "vitest";
import { computeEstimate, computeTotals, degreeTotal } from "@/lib/core/estimate";
import { derive, usdTerm } from "@/lib/core/derive";
import { usd } from "@/lib/core/money";
import { baseInput, LAFAYETTE_RENT, PURDUE, TODAY } from "../fixtures/inputs";
import { INR_HISTORY } from "../fixtures/fxHistory";

const fx = {
  today: { date: TODAY, rate: 95.27, source: "Frankfurter blended" },
  history: INR_HISTORY,
  minorDigits: 2,
};

describe("computeEstimate", () => {
  it("produces totals that add up and a hidden-cost percentage", () => {
    const e = computeEstimate(baseInput(), { today: TODAY, school: PURDUE, fx });
    const { totals } = e;
    expect(totals.total).toBe(
      totals.tuition +
        totals.housing +
        totals.healthInsurance +
        totals.living +
        totals.oneOff +
        totals.moneyMoving,
    );
    expect(totals.tuition).toBe(usd(28794 * 2));
    expect(totals.hiddenPercentOfTuition).toBeGreaterThan(30);
    expect(e.fx.kind).toBe("replay");
    expect(e.sources.some((s) => s.name === "Frankfurter blended")).toBe(true);
    expect(e.noteIds).toContain("transfer_assumption");
  });

  it("schedule amounts equal the counted totals (timing-only and risk items excluded)", () => {
    const input = baseInput({
      options: {
        enrolmentDepositUsd: usd(500),
        housing: {
          kind: "off_campus",
          bedrooms: 1,
          roommates: 0,
          lastMonthUpfront: true,
          twelveMonthLease: true,
        },
      },
    });
    const e = computeEstimate(input, { today: TODAY, school: PURDUE, rent: LAFAYETTE_RENT, fx });
    const scheduled = e.schedule.reduce((s, ev) => s + ev.amountUsd, 0);
    const counted = e.totals.total - e.totals.moneyMoving;
    expect(scheduled).toBe(counted);
  });

  it("handles a one-year programme, no school data, and paying from USD", () => {
    const e = computeEstimate(baseInput({ degreeYears: 1, options: { payFromUsd: true } }), {
      today: TODAY,
      fx,
    });
    expect(e.totals.tuition).toBe(usd(28794));
    expect(e.totals.moneyMoving).toBe(0);
    expect(e.fx).toMatchObject({ kind: "unsupported", reasonId: "pay_from_usd" });
    expect(e.noteIds).toContain("pay_from_usd");
  });

  it("marks the range unavailable for a currency without history, keeping today's conversion", () => {
    const e = computeEstimate(baseInput({ countryCode: "NG", homeCurrency: "NGN" }), {
      today: TODAY,
      school: PURDUE,
      fx: { ...fx, history: [] },
    });
    expect(e.fx).toMatchObject({ kind: "unsupported", reasonId: "no_history" });
    if (e.fx.kind === "unsupported") expect(e.fx.baselineHome).toBeGreaterThan(0);
  });

  it("degreeTotal multiplies by the right number of occurrences", () => {
    const src = { id: "rule" as const, kind: "estimate" as const, name: "x", date: TODAY };
    const derivation = derive("given", [usdTerm("x", usd(100))]).derivation;
    expect(
      degreeTotal(
        {
          id: "rent",
          category: "housing",
          amountUsd: usd(100),
          derivation,
          frequency: "per_month",
          phase: "ongoing",
          billing: "monthly",
          source: src,
        },
        2,
      ),
    ).toBe(usd(2000));
    expect(
      degreeTotal(
        {
          id: "summerRent",
          category: "housing",
          amountUsd: usd(100),
          derivation,
          frequency: "per_month",
          phase: "ongoing",
          billing: "summer",
          source: src,
        },
        2,
      ),
    ).toBe(usd(400));
    expect(
      degreeTotal(
        {
          id: "x",
          category: "housing",
          amountUsd: usd(100),
          derivation,
          frequency: "one_off",
          phase: "arrival",
          billing: "arrival",
          source: src,
          timingOnly: true,
        },
        2,
      ),
    ).toBe(0);
    expect(computeTotals([], 2, usd(10)).total).toBe(usd(10));
  });
});
