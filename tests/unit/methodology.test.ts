import { describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { SOURCE_IDS } from "@/data/sources";
import { computeEstimate } from "@/lib/core/estimate";
import { usd } from "@/lib/core/money";
import type { Category, SourceId } from "@/lib/core/types";
import { METHODOLOGY } from "@/lib/ui/methodology";
import { INR_HISTORY } from "../fixtures/fxHistory";
import { baseInput, LAFAYETTE_RENT, NYC_RENT, NYU, PURDUE, TODAY } from "../fixtures/inputs";

const fx = {
  today: { date: TODAY, rate: 95.27, source: "Frankfurter blended" },
  history: INR_HISTORY.slice(-400),
  minorDigits: 2,
};

// Inputs chosen so that, between them, every source the engine can attach to a line appears.
const cases = [
  computeEstimate(baseInput(), { today: TODAY, school: PURDUE, rent: LAFAYETTE_RENT, fx }),
  computeEstimate(
    baseInput({
      tuitionSource: { id: "user", kind: "user", name: "Your input", date: TODAY },
      options: {
        housing: {
          kind: "off_campus",
          bedrooms: 1,
          roommates: 1,
          twelveMonthLease: true,
          lastMonthUpfront: true,
          tempAccommodationNights: 3,
        },
        insurance: { kind: "school_plan", premiumPerYearUsd: usd(3000) },
        flights: { tripsHomePerYear: 1, oneWayUsd: usd(900) },
        transfer: { markupBps: 100, fixedFeeUsd: usd(5) },
        customCosts: [
          { label: "Laptop", amountUsd: usd(1200), frequency: "one_off" },
          { label: "Phone", amountUsd: usd(20), frequency: "monthly" },
        ],
      },
    }),
    { today: TODAY, school: NYU, rent: NYC_RENT, fx },
  ),
  // No school data and no area rent: every figure falls back to a constant.
  computeEstimate(
    baseInput({ options: { housing: { kind: "off_campus", bedrooms: 1, roommates: 0 } } }),
    { today: TODAY, fx },
  ),
];

describe("the methodology table", () => {
  it("lists exactly the sources the engine attaches to each category", () => {
    for (const row of METHODOLOGY) {
      if (row.key === "fx" || row.key === "money_moving") continue;
      const observed = new Set<SourceId>();
      for (const e of cases)
        for (const item of e.items)
          if (item.category === (row.key as Category)) observed.add(item.source.id);
      expect([...observed].sort(), row.key).toEqual([...row.sourceIds].sort());
    }
    const fxRow = METHODOLOGY.find((r) => r.key === "fx");
    expect(cases[0]?.sources.map((s) => s.id)).toContain("frankfurter");
    expect(fxRow?.sourceIds).toEqual(["frankfurter"]);
  });

  it("names only registered sources and has copy for every row", () => {
    for (const row of METHODOLOGY) {
      for (const id of row.sourceIds) expect(SOURCE_IDS).toContain(id);
      expect(copy.methodology.rows[row.key], row.key).toBeTruthy();
      expect(row.kinds.length).toBeGreaterThan(0);
    }
  });
});
