import { describe, expect, it } from "vitest";
import { SAVINGS_MIN_USD } from "@/data/constants";
import { computeEstimate, type EstimateContext } from "@/lib/core/estimate";
import { rankLevers } from "@/lib/core/levers";
import { formatLakhCrore, formatMoney } from "@/lib/core/format";
import { usd } from "@/lib/core/money";
import type { Estimate, EstimateInput } from "@/lib/core/types";
import { INR_HISTORY, KRW_HISTORY } from "../fixtures/fxHistory";
import { baseInput, LAFAYETTE_RENT, NYC_RENT, NYU, PURDUE, TODAY } from "../fixtures/inputs";

// Golden scenarios: fixed inputs whose totals are snapshotted, so any change to the model shows
// up in review. Update the snapshots deliberately (vitest -u) and explain why in the commit.

interface Run {
  e: Estimate;
  ctx: EstimateContext;
}
const run = (input: EstimateInput, ctx: EstimateContext): Run => ({
  e: computeEstimate(input, ctx),
  ctx,
});

function summary({ e, ctx }: Run, currency: "INR" | "KRW" | "USD") {
  const t = e.totals;
  const fmt = (n: number) => (n / 100).toFixed(2);
  const home = (m: number) =>
    currency === "INR"
      ? formatLakhCrore(m as never, 2, "₹")
      : currency === "KRW"
        ? formatMoney(m as never, { currency: "KRW", locale: "ko-KR", minorDigits: 0 })
        : String(m);
  return {
    totalsUsd: {
      tuition: fmt(t.tuition),
      housing: fmt(t.housing),
      healthInsurance: fmt(t.healthInsurance),
      living: fmt(t.living),
      oneOff: fmt(t.oneOff),
      moneyMoving: fmt(t.moneyMoving),
      total: fmt(t.total),
      hiddenPercent: t.hiddenPercentOfTuition,
    },
    payments: e.schedule.length,
    firstPayment: e.schedule[0]?.date,
    lastPayment: e.schedule.at(-1)?.date,
    fx:
      e.fx.kind === "replay"
        ? {
            baseline: home(e.fx.baselineHome),
            best10: home(e.fx.best10Home),
            median: home(e.fx.medianHome),
            worst10: home(e.fx.worst10Home),
            windows: e.fx.windows.length,
          }
        : { unsupported: e.fx.reasonId },
    notes: e.noteIds,
    // Step 2: the levers that apply, ranked, each a re-run of the engine (never added up).
    levers: rankLevers(e.input, e, ctx, { thresholdUsd: SAVINGS_MIN_USD }).map((l) =>
      l.hasFigure ? `${l.id} $${fmt(l.savingUsd)} (${l.confidence})` : `${l.id} tip`,
    ),
  };
}

const inr = {
  today: { date: TODAY, rate: 95.27, source: "Frankfurter blended" },
  history: INR_HISTORY,
  minorDigits: 2,
};
const krw = {
  today: { date: TODAY, rate: 1360.5, source: "Frankfurter blended" },
  history: KRW_HISTORY,
  minorDigits: 0,
};

describe("golden scenarios", () => {
  it("1. Indian master's student, large public university, on campus", () => {
    const r = run(baseInput(), { today: TODAY, school: PURDUE, fx: inr });
    expect(summary(r, "INR")).toMatchInlineSnapshot(`
      {
        "firstPayment": "2027-05-17",
        "fx": {
          "baseline": "₹1.01 crore",
          "best10": "₹1.01 crore",
          "median": "₹1.05 crore",
          "windows": 532,
          "worst10": "₹1.1 crore",
        },
        "lastPayment": "2029-05-22",
        "levers": [
          "flights-fewer $4090.00 (estimate)",
          "transfer-markup $1039.83 (estimate)",
          "insurance-waiver tip",
        ],
        "notes": [
          "transfer_assumption",
        ],
        "payments": 8,
        "totalsUsd": {
          "healthInsurance": "5600.00",
          "hiddenPercent": 83,
          "housing": "25640.00",
          "living": "6860.00",
          "moneyMoving": "1679.75",
          "oneOff": "8295.00",
          "total": "105662.75",
          "tuition": "57588.00",
        },
      }
    `);
  });

  it("2. Indian master's student, NYU, off campus sharing a 2-bedroom, 12-month lease", () => {
    const r = run(
      baseInput({
        school: {
          unitId: 193900,
          name: "New York University",
          city: "New York",
          state: "NY",
          zip: "10012",
        },
        tuitionPerYearUsd: usd(62000),
        options: {
          housing: { kind: "off_campus", bedrooms: 2, roommates: 1, twelveMonthLease: true },
          transfer: { markupBps: 80, fixedFeeUsd: usd(5) },
        },
      }),
      { today: TODAY, school: NYU, rent: NYC_RENT, fx: inr },
    );
    expect(summary(r, "INR")).toMatchInlineSnapshot(`
      {
        "firstPayment": "2027-05-17",
        "fx": {
          "baseline": "₹1.86 crore",
          "best10": "₹1.88 crore",
          "median": "₹1.96 crore",
          "windows": 528,
          "worst10": "₹2.05 crore",
        },
        "lastPayment": "2029-07-01",
        "levers": [
          "roommates-2 $13020.00 (government)",
          "lease-12-vs-9 $6269.60 (estimate)",
          "flights-fewer $4032.00 (estimate)",
          "housing-oncampus $1622.00 (school)",
          "transfer-markup $580.78 (estimate)",
          "insurance-waiver tip",
        ],
        "notes": [],
        "payments": 30,
        "totalsUsd": {
          "healthInsurance": "5600.00",
          "hiddenPercent": 57,
          "housing": "38750.00",
          "living": "16200.00",
          "moneyMoving": "1698.76",
          "oneOff": "9045.00",
          "total": "195293.76",
          "tuition": "124000.00",
        },
      }
    `);
  });

  it("3. Korean undergraduate, four years, on campus, scholarship, two trips home", () => {
    const r = run(
      baseInput({
        countryCode: "KR",
        homeCurrency: "KRW",
        degreeYears: 4,
        options: { scholarshipPerYearUsd: usd(8000), flights: { tripsHomePerYear: 2 } },
      }),
      { today: TODAY, school: PURDUE, rent: LAFAYETTE_RENT, fx: krw },
    );
    expect(summary(r, "KRW")).toMatchInlineSnapshot(`
      {
        "firstPayment": "2027-05-17",
        "fx": {
          "baseline": "₩245,909,111",
          "best10": "₩237,849,316",
          "median": "₩251,602,941",
          "windows": 458,
          "worst10": "₩266,553,183",
        },
        "lastPayment": "2031-05-22",
        "levers": [
          "flights-fewer $7308.00 (estimate)",
          "transfer-markup $1778.71 (estimate)",
          "insurance-waiver tip",
        ],
        "notes": [
          "scholarship_applied",
          "transfer_assumption",
        ],
        "payments": 14,
        "totalsUsd": {
          "healthInsurance": "11200.00",
          "hiddenPercent": 117,
          "housing": "51280.00",
          "living": "13720.00",
          "moneyMoving": "2878.07",
          "oneOff": "18495.00",
          "total": "180749.07",
          "tuition": "83176.00",
        },
      }
    `);
  });

  it("4. One-year programme with no school data, paying from a US dollar account", () => {
    const r = run(
      baseInput({
        degreeYears: 1,
        startTerm: { year: 2027, season: "spring" },
        options: { payFromUsd: true },
      }),
      { today: TODAY, fx: inr },
    );
    expect(summary(r, "USD")).toMatchInlineSnapshot(`
      {
        "firstPayment": "2026-10-12",
        "fx": {
          "unsupported": "pay_from_usd",
        },
        "lastPayment": "2027-10-22",
        "levers": [
          "flights-fewer $2000.00 (estimate)",
          "insurance-waiver tip",
        ],
        "notes": [
          "no_school_housing_figure",
          "pay_from_usd",
        ],
        "payments": 5,
        "totalsUsd": {
          "healthInsurance": "2800.00",
          "hiddenPercent": 93,
          "housing": "14000.00",
          "living": "3700.00",
          "moneyMoving": "0.00",
          "oneOff": "6295.00",
          "total": "55589.00",
          "tuition": "28794.00",
        },
      }
    `);
  });

  it("5. Family of three (two F-2 dependants), off campus, own rent known", () => {
    const r = run(
      baseInput({
        options: {
          dependants: 2,
          housing: { kind: "off_campus", bedrooms: 2, roommates: 0, monthlyRentUsd: usd(1400) },
          insurance: { kind: "school_plan", premiumPerYearUsd: usd(3200) },
        },
      }),
      { today: TODAY, school: PURDUE, rent: LAFAYETTE_RENT, fx: inr },
    );
    expect(summary(r, "INR")).toMatchInlineSnapshot(`
      {
        "firstPayment": "2027-05-17",
        "fx": {
          "baseline": "₹1.24 crore",
          "best10": "₹1.25 crore",
          "median": "₹1.3 crore",
          "windows": 532,
          "worst10": "₹1.36 crore",
        },
        "lastPayment": "2029-05-22",
        "levers": [
          "flights-fewer $4060.00 (estimate)",
          "transfer-markup $1281.63 (estimate)",
          "transfers-fewer $270.00 (estimate)",
          "insurance-waiver tip",
        ],
        "notes": [
          "transfer_assumption",
        ],
        "payments": 26,
        "totalsUsd": {
          "healthInsurance": "16400.00",
          "hiddenPercent": 127,
          "housing": "29400.00",
          "living": "14860.00",
          "moneyMoving": "2312.45",
          "oneOff": "9915.00",
          "total": "130475.45",
          "tuition": "57588.00",
        },
      }
    `);
  });
});
