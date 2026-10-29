import { describe, expect, it } from "vitest";
import { mockSources } from "@/lib/adapters/mock/sources";
import type { DataSources } from "@/lib/adapters/types";
import { EstimateRequestSchema } from "@/lib/schema/estimate";
import { runEstimate, toEstimateInput } from "@/services/estimate";

const req = EstimateRequestSchema.parse({
  countryCode: "IN",
  homeCurrency: "INR",
  school: {
    unitId: 243780,
    name: "Purdue University-Main Campus",
    city: "West Lafayette",
    state: "IN",
    zip: "47907",
  },
  tuitionPerYear: 28794,
  tuitionSource: "school",
  degreeYears: 2,
  startTerm: { year: 2027, season: "fall" },
  options: { housing: { kind: "off_campus", bedrooms: 1, roommates: 0 } },
});
const NOW = new Date("2026-10-29T12:00:00Z");

describe("mock sources", () => {
  it("search is a case-insensitive substring match over the fixture", async () => {
    const r = await mockSources.schools.search("purdue", AbortSignal.timeout(1000));
    expect(r.map((s) => s.name)).toEqual(["Purdue University-Main Campus"]);
    expect(r[0]?.tuitionOutOfStateUsd).toBe(2879400);
    expect(r[0]?.predominantDegree).toBe(3);
    expect(await mockSources.schools.search("", AbortSignal.timeout(1000))).toEqual([]);
  });
  it("latest FX is real recorded data; history is a labelled sample ending today", async () => {
    const latest = await mockSources.fx.latest("INR", AbortSignal.timeout(1000));
    expect(latest?.rate).toBeGreaterThan(50);
    expect(latest?.source).toMatch(/fixture/);
    const hist = await mockSources.fx.history("INR", AbortSignal.timeout(1000));
    expect(hist.at(-1)?.date).toBe(latest?.date);
    expect(hist.length).toBeGreaterThan(3000);
  });
});

describe("runEstimate", () => {
  it("runs end to end on the mocks with a replay range and a share query", async () => {
    const r = await runEstimate(req, mockSources, NOW);
    expect(r.demo).toBe(true);
    expect(r.degraded).toEqual([]);
    expect(r.estimate.fx.kind).toBe("replay");
    expect(r.estimate.items.find((i) => i.id === "rent")?.amountUsd).toBe(95000);
    expect(r.currency).toMatchObject({ code: "INR", grouping: "indian", minorDigits: 2 });
    expect(r.shareQuery).toContain("s=243780");
  });

  it("degrades gracefully when a source fails or is slow", async () => {
    const failing: DataSources = {
      ...mockSources,
      rent: {
        forArea: async () => {
          throw new Error("hud down");
        },
      },
      fx: {
        ...mockSources.fx,
        history: () => new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), 10)),
      },
    };
    const r = await runEstimate(req, failing, NOW);
    expect(r.degraded).toEqual(["rent", "fx_history"]);
    expect(r.estimate.items.find((i) => i.id === "rent")?.source.kind).toBe("estimate");
    expect(r.estimate.fx).toMatchObject({ kind: "unsupported", reasonId: "no_history" });
    expect(r.estimate.noteIds).toContain("no_area_rent");
  });

  it("skips history for USD and reports no exchange-rate risk", async () => {
    const r = await runEstimate({ ...req, homeCurrency: "USD" }, mockSources, NOW);
    expect(r.estimate.fx).toMatchObject({ kind: "unsupported", reasonId: "no_history" });
    expect(r.currency.code).toBe("USD");
  });

  it("converts dollars to cents at the boundary", () => {
    const input = toEstimateInput(
      { ...req, options: { scholarshipPerYear: 1234.5, transfer: { markupBps: 80, fixedFee: 5 } } },
      "2026-10-29",
    );
    expect(input.options.scholarshipPerYearUsd).toBe(123450);
    expect(input.options.transfer).toEqual({ markupBps: 80, fixedFeeUsd: 500 });
    expect(input.tuitionSource.kind).toBe("school");
  });
});
