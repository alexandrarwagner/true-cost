import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockSources } from "@/lib/adapters/mock/sources";
import type { RankedLever } from "@/lib/core/levers";
import { EstimateRequestSchema } from "@/lib/schema/estimate";
import { decodeShare, encodeShare } from "@/lib/schema/share";
import { resetEnvForTests } from "@/lib/server/env";
import { runEstimate } from "@/services/estimate";
import { resolveActive } from "@/services/levers";

const req = EstimateRequestSchema.parse({
  countryCode: "IN",
  homeCurrency: "INR",
  school: {
    unitId: 193900,
    name: "New York University",
    city: "New York",
    state: "NY",
    zip: "10012",
  },
  tuitionPerYear: 62000,
  degreeYears: 2,
  startTerm: { year: 2027, season: "fall" },
  options: { housing: { kind: "off_campus", bedrooms: 2, roommates: 1, twelveMonthLease: true } },
  levers: ["roommates-2", "flights-fewer", "housing-oncampus", "transfer-markup"],
});
const NOW = new Date("2026-10-29T12:00:00Z");

const ranked = (ids: Array<[RankedLever["id"], boolean]>): RankedLever[] =>
  ids.map(([id, hasFigure]) => ({
    id,
    savingUsd: 1 as never,
    hasFigure,
    confidence: "estimate",
    noteId: "x",
    excludes: [],
  }));

describe("resolveActive", () => {
  it("keeps only offered figures, in canonical order, dropping an excluded later lever", () => {
    const offered = ranked([
      ["roommates-2", true],
      ["housing-oncampus", true],
      ["insurance-waiver", false],
      ["flights-fewer", true],
    ]);
    expect(
      resolveActive(
        ["flights-fewer", "insurance-waiver", "roommates-2", "housing-oncampus"],
        offered,
      ),
    ).toEqual(["housing-oncampus", "flights-fewer"]);
    expect(resolveActive(["lease-12-vs-9"], offered)).toEqual([]);
  });
});

describe("runEstimate with SAVINGS_ENABLED", () => {
  beforeEach(() => {
    vi.stubEnv("SAVINGS_ENABLED", "true");
    resetEnvForTests();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvForTests();
  });

  it("ranks levers against the baseline, applies the resolved ones, and shares them", async () => {
    const r = await runEstimate(req, mockSources, NOW);
    expect(r.savings).toBeDefined();
    const s = r.savings;
    if (!s) return;
    expect(s.levers[0]?.id).toBe("roommates-2");
    expect(s.levers.at(-1)).toMatchObject({ id: "insurance-waiver", hasFigure: false });
    // On the fixture rents, on campus at NYU saves nothing, so it is not offered and the
    // requested roommates lever stays. No two active levers may exclude each other.
    expect(s.active).toEqual(["roommates-2", "transfer-markup", "flights-fewer"]);
    expect(s.levers.some((l) => l.id === "housing-oncampus")).toBe(false);
    expect(r.estimate.totals.total).toBeLessThan(s.baselineTotals.total);
    expect(r.estimate.input.options.housing?.roommates).toBe(2);
    expect(s.uncertainty?.lowHome).toBeLessThan(s.uncertainty?.highHome ?? 0);
    const params = new URLSearchParams(r.shareQuery);
    expect(params.get("lv")).toBe("roommates-2,transfer-markup,flights-fewer");
    expect(decodeShare(params)?.levers).toEqual(s.active);
  });

  it("with nothing switched on the estimate is the baseline and the link carries no lv", async () => {
    const r = await runEstimate({ ...req, levers: [] }, mockSources, NOW);
    expect(r.savings?.active).toEqual([]);
    expect(r.estimate.totals).toEqual(r.savings?.baselineTotals);
    expect(new URLSearchParams(r.shareQuery).has("lv")).toBe(false);
    expect([...encodeShare({ ...req, levers: [] }).keys()]).not.toContain("lv");
  });
});

describe("runEstimate with SAVINGS_ENABLED=false", () => {
  beforeEach(() => {
    vi.stubEnv("SAVINGS_ENABLED", "false");
    resetEnvForTests();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvForTests();
  });
  it("carries no savings and ignores requested levers", async () => {
    const r = await runEstimate(req, mockSources, NOW);
    expect(r.savings).toBeUndefined();
    expect(r.estimate.input.options.housing?.kind).toBe("off_campus");
  });
});
