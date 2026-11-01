import { describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { computeEstimate } from "@/lib/core/estimate";
import { usd } from "@/lib/core/money";
import { formatUsd } from "@/lib/core/format";
import { itemSentences } from "@/lib/ui/formula";
import { INR_HISTORY } from "../fixtures/fxHistory";
import { baseInput, LAFAYETTE_RENT, NYC_RENT, NYU, PURDUE, TODAY } from "../fixtures/inputs";

const fx = {
  today: { date: TODAY, rate: 95.27, source: "Frankfurter blended" },
  history: INR_HISTORY.slice(-400),
  minorDigits: 2,
};
const CONSTANT_IDS = new Set([
  "flightSouthAsia",
  "flightEastAsia",
  "flightSoutheastAsia",
  "flightNorthAmerica",
  "flightAfrica",
  "flightSouthAmerica",
  "visaApplicationMrv",
  "visaIntegrityFee",
  "tempAccommodationPerNight",
  "dependantInsurancePerYear",
]);

describe("the full-calculation page's sentences", () => {
  const cases = [
    computeEstimate(
      baseInput({
        options: {
          scholarshipPerYearUsd: usd(5000),
          dependants: 1,
          enrolmentDepositUsd: usd(500),
          flights: { tripsHomePerYear: 2 },
          customCosts: [{ label: "Laptop", amountUsd: usd(1200), frequency: "one_off" }],
        },
      }),
      { today: TODAY, school: PURDUE, rent: LAFAYETTE_RENT, fx },
    ),
    computeEstimate(
      baseInput({
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
          insurance: { kind: "waiver" },
          customCosts: [
            {
              label: "Phone plan",
              amountUsd: usd(20),
              frequency: "monthly",
              converted: { amountHome: 2000, currency: "INR", rate: 100, date: TODAY },
            },
          ],
        },
      }),
      { today: TODAY, school: NYU, rent: NYC_RENT, fx },
    ),
    computeEstimate(baseInput({ degreeYears: 1, options: { payFromUsd: true } }), {
      today: TODAY,
      fx,
    }),
  ];

  it("have copy for every term label, so no raw key ever reaches the page", () => {
    for (const e of cases)
      for (const item of e.items)
        for (const term of item.derivation.terms)
          expect(
            copy.terms[term.label] !== undefined || CONSTANT_IDS.has(term.label),
            `${item.id}: ${term.label}`,
          ).toBe(true);
  });

  it("state the per-occurrence result and the degree total", () => {
    for (const e of cases)
      for (const item of e.items) {
        const s = itemSentences(item, e.input.degreeYears);
        if (item.derivation.formula !== "given")
          expect(s.formula).toContain(formatUsd(item.amountUsd));
        if (!item.riskOnly && !item.timingOnly && item.frequency !== "one_off")
          expect(s.overDegree).toMatch(/^× \d+ \w+ over \d+ years? = \$/);
      }
    const rent = cases[1]?.items.find((i) => i.id === "rent");
    expect(rent && itemSentences(rent, 2).formula).toBe(
      "$3,100 the area's rent for this size, a month ÷ 3 people = $1,033",
    );
  });
});
