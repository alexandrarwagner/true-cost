import { describe, expect, it } from "vitest";
import { buildLineItems } from "@/lib/core/costModel";
import { occurrencesOverDegree } from "@/lib/core/estimate";
import { derive, usdTerm } from "@/lib/core/derive";
import { usd } from "@/lib/core/money";
import { buildSchedule } from "@/lib/core/schedule";
import { baseInput, LAFAYETTE_RENT, PURDUE, TODAY } from "../fixtures/inputs";

const transfer = { markupBps: 0, fixedFeeUsd: usd(0) };

describe("billing-driven schedule", () => {
  it("every item carries a billing rule and the schedule needs no item-specific knowledge", () => {
    const { items } = buildLineItems(
      baseInput({
        options: {
          housing: {
            kind: "off_campus",
            bedrooms: 1,
            roommates: 0,
            twelveMonthLease: true,
            lastMonthUpfront: true,
          },
          enrolmentDepositUsd: usd(500),
        },
      }),
      { school: PURDUE, rent: LAFAYETTE_RENT },
      TODAY,
    );
    for (const i of items) expect(i.billing).toBeTruthy();
    const events = buildSchedule(
      items,
      baseInput({
        options: {
          housing: {
            kind: "off_campus",
            bedrooms: 1,
            roommates: 0,
            twelveMonthLease: true,
            lastMonthUpfront: true,
          },
          enrolmentDepositUsd: usd(500),
        },
      }),
      { transfer, payFromUsd: true },
    );
    // Summer rent in year one, overlap rent after the final year, each its own item.
    expect(events.some((e) => e.itemIds.includes("summerRent") && e.date === "2028-06-01")).toBe(
      true,
    );
    expect(
      events.some(
        (e) =>
          e.itemIds.includes("overlapRent") && e.date === "2029-06-01" && e.phase === "departure",
      ),
    ).toBe(true);
    expect(events.some((e) => e.itemIds.includes("summerRent") && e.date === "2029-06-01")).toBe(
      false,
    );
  });

  it("year scope limits occurrences: summer rent counts the non-final years, overlap rent the final one", () => {
    const src = { id: "rule" as const, kind: "estimate" as const, name: "x", date: TODAY };
    const base = {
      category: "housing" as const,
      amountUsd: usd(100),
      frequency: "per_month" as const,
      phase: "ongoing" as const,
      billing: "summer" as const,
      source: src,
      derivation: derive("given", [usdTerm("x", usd(100))]).derivation,
    };
    expect(occurrencesOverDegree({ id: "summerRent", ...base, yearScope: "non_final" }, 2)).toBe(2);
    expect(occurrencesOverDegree({ id: "overlapRent", ...base, yearScope: "final" }, 2)).toBe(2);
    expect(occurrencesOverDegree({ id: "summerRent", ...base, yearScope: "non_final" }, 1)).toBe(0);
    expect(occurrencesOverDegree({ id: "rent", ...base, billing: "monthly" }, 3)).toBe(30);
  });

  it("a one-year lease has no summer rent item but still an overlap item", () => {
    const { items } = buildLineItems(
      baseInput({
        degreeYears: 1,
        options: {
          housing: { kind: "off_campus", bedrooms: 1, roommates: 0, twelveMonthLease: true },
        },
      }),
      { school: PURDUE, rent: LAFAYETTE_RENT },
      TODAY,
    );
    expect(items.some((i) => i.id === "summerRent")).toBe(false);
    expect(items.some((i) => i.id === "overlapRent")).toBe(true);
  });
});
