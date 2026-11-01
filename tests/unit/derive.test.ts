import { describe, expect, it } from "vitest";
import { SOURCE_IDS } from "@/data/sources";
import { countTerm, derive, evaluate, usdTerm } from "@/lib/core/derive";
import { computeEstimate, degreeTotal } from "@/lib/core/estimate";
import { usd } from "@/lib/core/money";
import type { Estimate, EstimateInput } from "@/lib/core/types";
import { EstimateRequestSchema } from "@/lib/schema/estimate";
import { decodeShare, encodeShare, MAX_SHARE_QUERY } from "@/lib/schema/share";
import { toEstimateInput } from "@/services/estimate";
import { INR_HISTORY } from "../fixtures/fxHistory";
import { baseInput, LAFAYETTE_RENT, NYC_RENT, NYU, PURDUE, TODAY } from "../fixtures/inputs";

const fx = {
  today: { date: TODAY, rate: 95.27, source: "Frankfurter blended" },
  history: INR_HISTORY,
  minorDigits: 2,
};
const purdue = { today: TODAY, school: PURDUE, rent: LAFAYETTE_RENT, fx };

/** Every line item's derivation reproduces its amount; every source is registered. */
function checkEstimate(e: Estimate) {
  expect(e.items.length).toBeGreaterThan(0);
  for (const item of e.items) {
    expect(evaluate(item.derivation.formula, item.derivation.terms), item.id).toBe(item.amountUsd);
    expect(item.derivation.result, item.id).toBe(item.amountUsd);
    expect(SOURCE_IDS, item.id).toContain(item.source.id);
    for (const t of item.derivation.terms)
      if (t.sourceId) expect(SOURCE_IDS, `${item.id}:${t.label}`).toContain(t.sourceId);
    // The breakdown page's degree figure is the per-occurrence result times the calendar count.
    expect(degreeTotal(item, e.input.degreeYears)).toBeGreaterThanOrEqual(0);
  }
  for (const s of e.sources) expect(SOURCE_IDS).toContain(s.id);
  expect(e.moneyMoving.totalUsd).toBe(e.totals.moneyMoving);
  expect(e.moneyMoving.markupUsd + e.moneyMoving.feesUsd).toBe(e.moneyMoving.totalUsd);
}

describe("evaluate", () => {
  it("applies each formula with the engine's own rounding", () => {
    expect(evaluate("given", [usdTerm("x", usd(10))])).toBe(usd(10));
    expect(evaluate("product", [usdTerm("x", usd(185)), countTerm("n", 3)])).toBe(usd(555));
    expect(
      evaluate("quotient", [usdTerm("x", usd(1000)), { label: "p", value: 3, unit: "people" }]),
    ).toBe(33333);
    expect(evaluate("difference", [usdTerm("a", usd(100)), usdTerm("b", usd(130))])).toBe(0);
    expect(evaluate("deducted", [usdTerm("a", usd(100)), usdTerm("b", usd(30))])).toBe(usd(70));
    const d = derive("product", [
      usdTerm("fare", usd(900)),
      countTerm("per_trip", 2),
      countTerm("trips", 2),
    ]);
    expect(d.amountUsd).toBe(usd(3600));
    expect(d.derivation.result).toBe(d.amountUsd);
  });
});

describe("every line item explains itself", () => {
  it("on campus at Purdue, with a scholarship, dependants and a deposit", () => {
    const input = baseInput({
      options: {
        scholarshipPerYearUsd: usd(5000),
        dependants: 2,
        enrolmentDepositUsd: usd(500),
        flights: { tripsHomePerYear: 2 },
      },
    });
    const e = computeEstimate(input, purdue);
    checkEstimate(e);
    expect(e.items.find((i) => i.id === "tuition")?.derivation).toMatchObject({
      formula: "difference",
      terms: [
        { label: "tuition_per_year", value: usd(28794), sourceId: "scorecard" },
        { label: "scholarship_per_year", value: usd(5000), sourceId: "user" },
      ],
    });
    expect(e.items.find((i) => i.id === "visaApplication")?.derivation.terms[1]).toEqual({
      label: "applicants",
      value: 3,
      unit: "count",
    });
  });

  it("off campus at NYU with roommates, a 12-month lease and temporary accommodation", () => {
    const input: EstimateInput = baseInput({
      school: { unitId: 193900, name: "NYU", city: "New York", state: "NY", zip: "10012" },
      options: {
        housing: {
          kind: "off_campus",
          bedrooms: 2,
          roommates: 2,
          twelveMonthLease: true,
          lastMonthUpfront: true,
          tempAccommodationNights: 5,
        },
      },
    });
    const e = computeEstimate(input, { today: TODAY, school: NYU, rent: NYC_RENT, fx });
    checkEstimate(e);
    const rent = e.items.find((i) => i.id === "rent");
    expect(rent?.derivation).toMatchObject({
      formula: "quotient",
      terms: [
        { label: "area_rent_for_bedrooms", value: usd(3100), sourceId: "hud" },
        { label: "people_sharing", value: 3, unit: "people" },
      ],
    });
    expect(rent?.amountUsd).toBe(103333);
    expect(e.items.find((i) => i.id === "securityDeposit")?.source.id).toBe("rule");
  });

  it("health insurance is its own category and the regroup leaves the total alone", () => {
    const e = computeEstimate(baseInput({ options: { dependants: 1 } }), purdue);
    const insurance = e.items.filter((i) => i.category === "health_insurance").map((i) => i.id);
    expect(insurance).toEqual(["healthInsurance", "dependantInsurance"]);
    expect(e.totals.healthInsurance).toBe(usd(2800 * 2 + 2500 * 2));
    expect(e.totals.total).toBe(
      e.totals.tuition +
        e.totals.housing +
        e.totals.healthInsurance +
        e.totals.living +
        e.totals.oneOff +
        e.totals.moneyMoving,
    );
    expect(e.items.filter((i) => i.category === "living").map((i) => i.id)).toEqual([
      "books",
      "otherExpenses",
    ]);
  });
});

describe("user-added costs", () => {
  const req = (customCosts: unknown) =>
    EstimateRequestSchema.parse({
      countryCode: "IN",
      homeCurrency: "INR",
      school: { unitId: 243780, name: "Purdue", city: "West Lafayette", state: "IN", zip: "47907" },
      tuitionPerYear: 28794,
      degreeYears: 2,
      startTerm: { year: 2027, season: "fall" },
      options: { customCosts },
    });

  it("become ordinary line items, converted once when entered in the home currency", () => {
    const r = req([
      { label: "Laptop", amount: 1200, currency: "USD", frequency: "one_off" },
      { label: "Phone plan", amount: 2000, currency: "home", frequency: "monthly" },
    ]);
    const input = toEstimateInput(r, TODAY, { rate: 100, minorDigits: 2 });
    expect(input.options.customCosts).toEqual([
      { label: "Laptop", amountUsd: usd(1200), frequency: "one_off" },
      {
        label: "Phone plan",
        amountUsd: usd(20),
        frequency: "monthly",
        converted: { amountHome: 2000, currency: "INR", rate: 100, date: TODAY },
      },
    ]);
    const e = computeEstimate(input, purdue);
    checkEstimate(e);
    expect(e.items.find((i) => i.id === "custom-0")).toMatchObject({
      category: "one_off",
      amountUsd: usd(1200),
      source: { id: "user", kind: "user" },
      noteId: "custom_cost",
    });
    expect(e.items.find((i) => i.id === "custom-1")).toMatchObject({
      category: "living",
      frequency: "per_month",
      amountUsd: usd(20),
    });
    expect(e.totals.oneOff).toBe(
      computeEstimate(toEstimateInput(req([]), TODAY), purdue).totals.oneOff + usd(1200),
    );
    expect(e.schedule.some((ev) => ev.itemIds.includes("custom-1"))).toBe(true);
    // Without today's rate a home-currency amount is left out rather than guessed.
    expect(toEstimateInput(r, TODAY).options.customCosts).toHaveLength(1);
  });

  it("are validated: plain labels up to 40 characters, at most ten, and a bounded share link", () => {
    expect(() => req([{ label: "", amount: 1, currency: "USD", frequency: "one_off" }])).toThrow();
    expect(() =>
      req([{ label: "a\u0007b", amount: 1, currency: "USD", frequency: "one_off" }]),
    ).toThrow();
    expect(() =>
      req([{ label: "x".repeat(41), amount: 1, currency: "USD", frequency: "one_off" }]),
    ).toThrow();
    const eleven = Array.from({ length: 11 }, (_, i) => ({
      label: `Item ${i}`,
      amount: 1,
      currency: "USD",
      frequency: "one_off",
    }));
    expect(() => req(eleven)).toThrow();
    const ten = req(eleven.slice(0, 10));
    const params = encodeShare(ten);
    expect(params.toString().length).toBeLessThan(MAX_SHARE_QUERY);
    expect(decodeShare(params)?.options.customCosts).toHaveLength(10);
    const long = req([{ label: "x".repeat(40), amount: 1, currency: "USD", frequency: "one_off" }]);
    const p = encodeShare(long);
    p.set("sn", "y".repeat(MAX_SHARE_QUERY));
    expect(decodeShare(p)).toBeNull();
  });
});
