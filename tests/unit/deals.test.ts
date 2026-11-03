import { describe, expect, it } from "vitest";
import { SAVINGS_MIN_USD } from "@/data/constants";
import { isShowable, savingOverDegree, savingPerPeriod } from "@/lib/core/deals";
import { computeEstimate } from "@/lib/core/estimate";
import { applyLevers, dealLever, rankLevers } from "@/lib/core/levers";
import type { LeverContext } from "@/lib/core/levers";
import { usd } from "@/lib/core/money";
import { DealSchema } from "@/lib/schema/deals";
import { EstimateRequestSchema } from "@/lib/schema/estimate";
import { dealsFor, readDealFiles } from "@/lib/server/deals";
import { HUGE_FOOD, MUSEUMS, SPOTIFY } from "../fixtures/deals";
import { baseInput, LAFAYETTE_RENT, PURDUE, TODAY } from "../fixtures/inputs";

const ctx: LeverContext = { today: TODAY, school: PURDUE, rent: LAFAYETTE_RENT };
const opts = { thresholdUsd: SAVINGS_MIN_USD };
// Paying from USD keeps transfer costs out, so a deal's saving is exactly the source's figure.
// (From a home currency the re-run also drops the markup on the money no longer sent.)
const offCampus = () =>
  baseInput({
    options: { housing: { kind: "off_campus", bedrooms: 1, roommates: 0 }, payFromUsd: true },
  });

describe("deal schema", () => {
  it("accepts the fixtures and rejects half-priced, unperiodised or http deals", () => {
    expect(DealSchema.safeParse(SPOTIFY).success).toBe(true);
    expect(DealSchema.safeParse(MUSEUMS).success).toBe(true);
    expect(DealSchema.safeParse({ ...SPOTIFY, regularPrice: undefined }).success).toBe(false);
    expect(DealSchema.safeParse({ ...SPOTIFY, period: undefined }).success).toBe(false);
    expect(DealSchema.safeParse({ ...SPOTIFY, sourceUrl: "http://x.com/" }).success).toBe(false);
    expect(DealSchema.safeParse({ ...SPOTIFY, sourceQuote: "" }).success).toBe(false);
    expect(DealSchema.safeParse({ ...SPOTIFY, checkedOn: "31/10/2026" }).success).toBe(false);
    expect(DealSchema.safeParse({ ...SPOTIFY, logo: "x.png" }).success).toBe(false);
  });

  it("the request schema takes deal ids as levers and nothing else", () => {
    const base = {
      countryCode: "IN",
      homeCurrency: "INR",
      school: { unitId: 1, name: "X", city: "Y", state: "NY", zip: "10012" },
      tuitionPerYear: 1,
      degreeYears: 2,
      startTerm: { year: 2027, season: "fall" },
    };
    const ok = EstimateRequestSchema.safeParse({
      ...base,
      levers: ["deal:spotify-premium-student"],
    });
    expect(ok.success).toBe(true);
    expect(EstimateRequestSchema.safeParse({ ...base, levers: ["deal:Bad Id"] }).success).toBe(
      false,
    );
    expect(EstimateRequestSchema.safeParse({ ...base, levers: ["spotify"] }).success).toBe(false);
  });
});

describe("deal savings", () => {
  it("come only from the source's two prices", () => {
    expect(savingPerPeriod(SPOTIFY)).toBe(usd(6));
    expect(savingOverDegree(SPOTIFY, 2)).toBe(usd(144));
    expect(savingOverDegree(SPOTIFY, 4)).toBe(usd(288));
    expect(savingPerPeriod(MUSEUMS)).toBeUndefined();
    expect(
      savingPerPeriod({ ...SPOTIFY, studentPrice: { amount: 699, currency: "EUR" } }),
    ).toBeUndefined();
    expect(
      savingPerPeriod({ ...SPOTIFY, regularPrice: { amount: 699, currency: "USD" } }),
    ).toBeUndefined();
  });

  it("show only approved deals checked within 90 days", () => {
    expect(isShowable(SPOTIFY, "2026-10-29")).toBe(true);
    expect(isShowable(SPOTIFY, "2027-01-29")).toBe(true);
    expect(isShowable(SPOTIFY, "2027-01-30")).toBe(false);
    expect(isShowable({ ...SPOTIFY, status: "pending" }, "2026-11-01")).toBe(false);
    expect(isShowable({ ...SPOTIFY, status: "expired" }, "2026-11-01")).toBe(false);
  });
});

describe("deals as levers", () => {
  it("apply as a deduction, once, and the engine caps it at the line", () => {
    const lever = dealLever(HUGE_FOOD);
    const input = offCampus();
    const once = lever.apply(input, input);
    expect(lever.apply(once, input)).toEqual(once);
    expect(once.options.deductions).toEqual([
      { id: "huge-food", lineId: "food", amountUsd: usd(5_000 * 24) },
    ]);
    const baseline = computeEstimate(input, ctx);
    const scenario = computeEstimate(once, ctx);
    const foodBefore = baseline.items.find((i) => i.id === "food")?.amountUsd ?? 0;
    expect(foodBefore).toBeGreaterThan(0);
    expect(scenario.items.find((i) => i.id === "food")?.amountUsd).toBe(0);
    expect(scenario.items.find((i) => i.id === "food")?.noteId).toBe("deal_applied");
    expect(baseline.totals.total - scenario.totals.total).toBe(foodBefore * 20);
    expect(scenario.totals.total).toBeGreaterThan(0);
  });

  it("rank in the same list: figures below the threshold still show, no figure means a tip", () => {
    const input = offCampus();
    const withDeals = { ...ctx, deals: [SPOTIFY, MUSEUMS, HUGE_FOOD] };
    const ranked = rankLevers(input, computeEstimate(input, withDeals), withDeals, opts);
    const spotify = ranked.find((l) => l.id === "deal:spotify-premium-student");
    expect(spotify).toMatchObject({ hasFigure: true, savingUsd: usd(144), deal: SPOTIFY });
    expect(spotify?.savingUsd).toBeLessThan(SAVINGS_MIN_USD);
    expect(ranked.find((l) => l.id === "deal:nyu-museum-gateway")).toMatchObject({
      hasFigure: false,
      savingUsd: 0,
    });
    const figures = ranked.filter((l) => l.hasFigure).map((l) => l.savingUsd);
    expect(figures).toEqual([...figures].sort((a, b) => b - a));
    expect(ranked.findIndex((l) => l.hasFigure)).toBeLessThan(
      ranked.findIndex((l) => !l.hasFigure),
    );
    // On campus there is no food line, so a food deal becomes a tip rather than a wrong figure.
    const onCampus = baseInput();
    const rankedOn = rankLevers(onCampus, computeEstimate(onCampus, withDeals), withDeals, opts);
    expect(rankedOn.find((l) => l.id === "deal:huge-food")?.hasFigure).toBe(false);
  });

  it("combine with other levers as one scenario, in canonical order", () => {
    const input = offCampus();
    const deals = [SPOTIFY];
    const combined = applyLevers(input, ["deal:spotify-premium-student", "roommates-1"], deals);
    expect(combined.options.housing?.roommates).toBe(1);
    expect(combined.options.deductions?.map((d) => d.id)).toEqual(["spotify-premium-student"]);
  });
});

describe("the checked-in deal files", () => {
  it("all parse, and NYU gets its own deals plus the national ones", () => {
    const files = readDealFiles();
    expect(files.schools.map((s) => s.unitId)).toContain(193900);
    expect(files.national.map((d) => d.id)).toContain("spotify-premium-student");
    const nyu = dealsFor(
      { unitId: 193900, name: "NYU", city: "New York", state: "NY", zip: "10012" },
      "2026-11-01",
    );
    expect(nyu.schoolChecked).toBe(true);
    // The school's own deal first, then every approved national deal (ten since 2 November).
    const ids = nyu.deals.map((d) => d.id);
    expect(ids[0]).toBe("nyu-museum-gateway");
    expect(ids.slice(1)).toEqual(files.national.map((d) => d.id));
    expect(ids).toContain("spotify-premium-student");
    const purdue = dealsFor(baseInput().school, "2026-11-01");
    expect(purdue).toEqual({ deals: files.national, schoolChecked: false });
    // Checks age out after 90 days.
    expect(dealsFor(baseInput().school, "2027-06-01").deals).toEqual([]);
  });
});
