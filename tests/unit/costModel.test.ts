import { describe, expect, it } from "vitest";
import { buildLineItems } from "@/lib/core/costModel";
import { usd } from "@/lib/core/money";
import { baseInput, LAFAYETTE_RENT, PURDUE, TODAY } from "../fixtures/inputs";

const ids = (r: ReturnType<typeof buildLineItems>) => r.items.map((i) => i.id);

describe("buildLineItems", () => {
  it("uses school data when present and labels sources", () => {
    const r = buildLineItems(baseInput(), { school: PURDUE }, TODAY);
    const books = r.items.find((i) => i.id === "books");
    expect(books?.amountUsd).toBe(usd(1090));
    expect(books?.source.kind).toBe("school");
    expect(ids(r)).toContain("roomAndBoard");
    expect(ids(r)).not.toContain("rent");
    expect(r.items.find((i) => i.id === "winterClothing")).toBeDefined(); // Indiana is cold
    expect(r.items.find((i) => i.id === "visaIntegrityFee")?.noteId).toBe("may_apply");
  });

  it("falls back to labelled estimates when school data is missing", () => {
    const r = buildLineItems(baseInput(), {}, TODAY);
    for (const id of ["books", "roomAndBoard", "otherExpenses", "healthInsurance"]) {
      expect(r.items.find((i) => i.id === id)?.source.kind).toBe("estimate");
    }
    expect(r.noteIds).toContain("no_school_housing_figure");
  });

  it("models off-campus housing with HUD rent split by roommates, deposit, food and summer rent", () => {
    const r = buildLineItems(
      baseInput({
        options: {
          housing: {
            kind: "off_campus",
            bedrooms: 2,
            roommates: 1,
            twelveMonthLease: true,
            lastMonthUpfront: true,
          },
        },
      }),
      { school: PURDUE, rent: LAFAYETTE_RENT },
      TODAY,
    );
    const rent = r.items.find((i) => i.id === "rent");
    expect(rent?.amountUsd).toBe(usd(575));
    expect(rent?.source.kind).toBe("government");
    expect(ids(r)).toEqual(
      expect.arrayContaining([
        "securityDeposit",
        "depositDeductions",
        "food",
        "summerRent",
        "lastMonthRentUpfront",
      ]),
    );
    expect(r.items.find((i) => i.id === "depositDeductions")?.riskOnly).toBe(true);
    expect(r.items.find((i) => i.id === "lastMonthRentUpfront")?.timingOnly).toBe(true);
    expect(r.comparisons[0]).toMatchObject({ itemId: "rent", alternativeUsd: usd(12820) });
  });

  it("clamps a scholarship larger than tuition to zero and notes it", () => {
    const r = buildLineItems(
      baseInput({ options: { scholarshipPerYearUsd: usd(40000) } }),
      { school: PURDUE },
      TODAY,
    );
    expect(r.items.find((i) => i.id === "tuition")?.amountUsd).toBe(0);
    expect(r.noteIds).toContain("scholarship_exceeds_tuition");
  });

  it("charges visa fees per dependant but SEVIS once, and adds dependant insurance", () => {
    const r = buildLineItems(baseInput({ options: { dependants: 2 } }), { school: PURDUE }, TODAY);
    expect(r.items.find((i) => i.id === "visaApplication")?.amountUsd).toBe(usd(185 * 3));
    expect(r.items.find((i) => i.id === "sevisFee")?.amountUsd).toBe(usd(350));
    expect(r.items.find((i) => i.id === "dependantInsurance")?.amountUsd).toBe(usd(5000));
  });

  it("uses the user's own numbers over estimates", () => {
    const r = buildLineItems(
      baseInput({
        options: {
          insurance: { kind: "school_plan", premiumPerYearUsd: usd(3100) },
          flights: { tripsHomePerYear: 2, oneWayUsd: usd(800) },
          enrolmentDepositUsd: usd(500),
        },
      }),
      { school: PURDUE },
      TODAY,
    );
    expect(r.items.find((i) => i.id === "healthInsurance")).toMatchObject({
      amountUsd: usd(3100),
      source: { kind: "user" },
    });
    expect(r.items.find((i) => i.id === "flightsHome")?.amountUsd).toBe(usd(3200));
    expect(r.items.find((i) => i.id === "enrolmentDeposit")?.timingOnly).toBe(true);
  });
});
