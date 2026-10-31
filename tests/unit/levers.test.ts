import { describe, expect, it } from "vitest";
import { SAVINGS_MIN_USD } from "@/data/constants";
import { computeEstimate } from "@/lib/core/estimate";
import { applyLevers, combinedScenario, LEVERS, leverById, rankLevers } from "@/lib/core/levers";
import type { Lever, LeverContext, LeverId } from "@/lib/core/levers";
import { usd } from "@/lib/core/money";
import type { EstimateInput } from "@/lib/core/types";
import { INR_HISTORY } from "../fixtures/fxHistory";
import { baseInput, LAFAYETTE_RENT, NYC_RENT, NYU, PURDUE, TODAY } from "../fixtures/inputs";

const fx = {
  today: { date: TODAY, rate: 95.27, source: "x" },
  history: INR_HISTORY,
  minorDigits: 2,
};
const purdue: LeverContext = { today: TODAY, school: PURDUE, rent: LAFAYETTE_RENT, fx };
const nyuCtx: LeverContext = { today: TODAY, school: NYU, rent: NYC_RENT, fx };
const opts = { thresholdUsd: SAVINGS_MIN_USD };
const nyu = (): EstimateInput =>
  baseInput({
    school: { unitId: 193900, name: "NYU", city: "New York", state: "NY", zip: "10012" },
    tuitionPerYearUsd: usd(62000),
    options: {
      housing: { kind: "off_campus", bedrooms: 2, roommates: 1, twelveMonthLease: true },
      transfer: { markupBps: 80, fixedFeeUsd: usd(5) },
    },
  });
const lever = (id: LeverId): Lever => {
  const l = leverById(id);
  if (!l) throw new Error(id);
  return l;
};
const ids = (input: EstimateInput, ctx: LeverContext) =>
  rankLevers(input, computeEstimate(input, ctx), ctx, opts).map((l) => l.id);

describe("each lever applies only when it should", () => {
  it("on campus: off-campus users at a school with a figure, never families", () => {
    const l = lever("housing-oncampus");
    expect(l.applies(nyu(), nyuCtx)).toBe(true);
    expect(l.applies(baseInput(), purdue)).toBe(false);
    expect(
      l.applies(nyu(), { ...nyuCtx, school: { ...NYU, roomBoardOnCampusUsd: undefined } }),
    ).toBe(false);
    expect(l.applies({ ...nyu(), options: { ...nyu().options, dependants: 1 } }, nyuCtx)).toBe(
      false,
    );
    expect(l.apply(nyu(), nyu()).options.housing).toEqual({
      kind: "on_campus",
      bedrooms: 1,
      roommates: 0,
    });
  });

  it("roommates: HUD-priced off-campus rent below the target count, not a known rent", () => {
    const r1 = lever("roommates-1");
    const r2 = lever("roommates-2");
    expect(r1.applies(nyu(), nyuCtx)).toBe(false);
    expect(r2.applies(nyu(), nyuCtx)).toBe(true);
    expect(r2.apply(nyu(), nyu()).options.housing?.roommates).toBe(2);
    const known = baseInput({
      options: {
        housing: { kind: "off_campus", bedrooms: 2, roommates: 0, monthlyRentUsd: usd(1400) },
      },
    });
    expect(r1.applies(known, purdue)).toBe(false);
    expect(r2.applies(known, purdue)).toBe(false);
  });

  it("lease: only a 12-month lease off campus", () => {
    const l = lever("lease-12-vs-9");
    expect(l.applies(nyu(), nyuCtx)).toBe(true);
    expect(l.applies(baseInput(), purdue)).toBe(false);
    expect(l.apply(nyu(), nyu()).options.housing?.twelveMonthLease).toBe(false);
  });

  it("insurance waiver: a tip unless the school's flag and the user's own premium are known", () => {
    const l = lever("insurance-waiver");
    expect(l.applies(baseInput(), purdue)).toBe(true);
    expect(l.hasFigure(baseInput(), purdue)).toBe(false);
    expect(l.noteId(baseInput(), purdue)).toBe("insurance_waiver_unknown");
    const flagged: LeverContext = {
      ...purdue,
      schoolFlags: { "243780": { waiverAllowed: true, sourceUrl: "https://x", checkedOn: TODAY } },
    };
    expect(l.hasFigure(baseInput(), flagged)).toBe(false);
    expect(l.noteId(baseInput(), flagged)).toBe("insurance_waiver_enter_premium");
    const own = baseInput({
      options: { insurance: { kind: "school_plan", ownPremiumPerYearUsd: usd(900) } },
    });
    expect(l.hasFigure(own, flagged)).toBe(true);
    expect(l.apply(own, own).options.insurance).toEqual({
      kind: "waiver",
      premiumPerYearUsd: usd(900),
      ownPremiumPerYearUsd: usd(900),
    });
    expect(l.applies(baseInput({ options: { insurance: { kind: "waiver" } } }), purdue)).toBe(
      false,
    );
  });

  it("transfers: fewer applies with a fixed fee, markup above the reference, neither from USD", () => {
    const fewer = lever("transfers-fewer");
    const markup = lever("transfer-markup");
    expect(fewer.applies(baseInput(), purdue)).toBe(true);
    expect(markup.applies(baseInput(), purdue)).toBe(true);
    expect(fewer.apply(baseInput(), baseInput()).options.transferCadence).toBe("semester");
    expect(markup.apply(nyu(), nyu()).options.transfer).toEqual({
      markupBps: 50,
      fixedFeeUsd: usd(5),
    });
    const cheap = baseInput({ options: { transfer: { markupBps: 20, fixedFeeUsd: usd(0) } } });
    expect(fewer.applies(cheap, purdue)).toBe(false);
    expect(markup.applies(cheap, purdue)).toBe(false);
    const fromUsd = baseInput({ options: { payFromUsd: true } });
    expect(fewer.applies(fromUsd, purdue)).toBe(false);
    expect(markup.applies(fromUsd, purdue)).toBe(false);
  });

  it("flights: one fewer than the baseline, never below zero, idempotent", () => {
    const l = lever("flights-fewer");
    const two = baseInput({ options: { flights: { tripsHomePerYear: 2 } } });
    expect(l.applies(two, purdue)).toBe(true);
    expect(l.applies(baseInput({ options: { flights: { tripsHomePerYear: 0 } } }), purdue)).toBe(
      false,
    );
    const once = l.apply(two, two);
    expect(once.options.flights?.tripsHomePerYear).toBe(1);
    expect(l.apply(once, two)).toEqual(once);
  });
});

describe("rankLevers", () => {
  it("ranks figures by saving, drops anything under the threshold, and puts tips last", () => {
    const input = nyu();
    const ranked = rankLevers(input, computeEstimate(input, nyuCtx), nyuCtx, opts);
    expect(ranked.map((l) => l.id)).toEqual([
      "roommates-2",
      "lease-12-vs-9",
      "flights-fewer",
      "housing-oncampus",
      "transfer-markup",
      "insurance-waiver",
    ]);
    const figures = ranked.filter((l) => l.hasFigure);
    for (let i = 1; i < figures.length; i++)
      expect(figures[i - 1]?.savingUsd ?? 0).toBeGreaterThanOrEqual(figures[i]?.savingUsd ?? 0);
    for (const l of figures) expect(l.savingUsd).toBeGreaterThan(SAVINGS_MIN_USD);
    expect(ranked.at(-1)).toMatchObject({ id: "insurance-waiver", hasFigure: false, savingUsd: 0 });
    expect(ranked[0]?.savingHome).toBe(Math.round((ranked[0]?.savingUsd ?? 0) * 95.27));
    expect(ranked.find((l) => l.id === "roommates-2")?.confidence).toBe("government");
  });

  it("offers no housing levers on campus and no transfer levers from a dollar account", () => {
    expect(ids(baseInput(), purdue)).toEqual([
      "flights-fewer",
      "transfer-markup",
      "insurance-waiver",
    ]);
    expect(ids(baseInput({ options: { payFromUsd: true } }), { today: TODAY, fx })).toEqual([
      "flights-fewer",
      "insurance-waiver",
    ]);
  });

  it("combines levers as one scenario in canonical order, which is less than their sum", () => {
    const input = nyu();
    const base = computeEstimate(input, nyuCtx);
    const ranked = rankLevers(input, base, nyuCtx, opts);
    const chosen = ["lease-12-vs-9", "roommates-2", "flights-fewer"] as const;
    const combined = combinedScenario(input, chosen, nyuCtx);
    const sum = ranked
      .filter((l) => chosen.includes(l.id as never))
      .reduce((s, l) => s + l.savingUsd, 0);
    const saving = base.totals.total - combined.estimate.totals.total;
    expect(saving).toBeGreaterThan(0);
    expect(saving).toBeLessThan(sum);
    expect(combined.input.options.housing).toMatchObject({ roommates: 2, twelveMonthLease: false });
    expect(applyLevers(input, [])).toEqual(input);
    expect(LEVERS.map((l) => l.id)).toContain("housing-oncampus");
  });
});
