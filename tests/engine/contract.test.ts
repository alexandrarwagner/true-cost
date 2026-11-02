import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mockSources } from "@/lib/adapters/mock/sources";
import { createEngine } from "@/lib/browser/engine";
import type { EngineDeps, PageInput } from "@/lib/browser/contract";
import { EstimateRequestSchema } from "@/lib/schema/estimate";
import { runEstimate } from "@/services/estimate";
import { buildEngine } from "../../scripts/build-engine.mjs";

/*
 * The engine behind window.TPEngine keeps the page's contract (design/wired/engine-adapter.js)
 * and gives the same numbers as the server-side estimate for the same inputs.
 */
const NOW = new Date("2026-11-01T12:00:00Z");
const NYU = {
  unitId: 193900,
  name: "New York University",
  city: "New York",
  state: "NY",
  zip: "10012",
};

const deps: EngineDeps = {
  async loadContext(school) {
    const costs = await mockSources.schools.costs(school.unitId, AbortSignal.timeout(1000));
    const rent = await mockSources.rent.forArea(
      { zip: school.zip, state: school.state, city: school.city },
      AbortSignal.timeout(1000),
    );
    return { school: costs?.costs ?? null, rent, demo: true };
  },
  async loadFx(currency) {
    return {
      today: await mockSources.fx.latest(currency, AbortSignal.timeout(1000)),
      history: await mockSources.fx.history(currency, AbortSignal.timeout(1000)),
    };
  },
  now: () => NOW,
};

const input: PageInput = {
  tuitionPerYearUsd: 65_622,
  years: 2,
  from: "India",
  currency: "INR",
  school: NYU,
  tuitionSource: "school",
  extras: [
    { name: "Laptop", amt: 1200, freq: "once" },
    { name: "Gym", amt: 40, freq: "month" },
  ],
};

const money = z.number().finite().nonnegative();
const series = z.array(money);
const EstimateShape = z.object({
  c: z.object({ tui: money, house: money, live: money, one: money, move: money }),
  tot: money,
  exM: money,
  exO: money,
  o: z.object({
    T: money,
    Y: z.number().int().min(1).max(6),
    rentM: money,
    liveM: money,
    rate: money,
  }),
  fx: z
    .object({
      today: series,
      p10: series,
      p90: series,
      worst: series,
      n: z.number().int().positive(),
      H: z.number().int().positive(),
      buf: z.number(),
      lo: money,
      hi: money,
      usdTotal: money,
    })
    .nullable(),
  meta: z.object({
    sampleNote: z.string().min(1),
    demo: z.boolean(),
    degraded: z.array(z.string()),
  }),
  lines: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1),
      amountUsd: money,
      confidence: z.enum(["user", "school", "government", "estimate"]),
      checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      source: z.object({ id: z.string(), name: z.string() }),
    }),
  ),
});

describe("TPEngine contract", () => {
  it("returns the page's shape, with the categories summing to the total", async () => {
    const engine = createEngine(deps, "engine-test");
    await engine.ready(input);
    const e = engine.estimate(input);
    expect(EstimateShape.safeParse(e).success, JSON.stringify(EstimateShape.safeParse(e))).toBe(
      true,
    );
    const sum = e.c.tui + e.c.house + e.c.live + e.c.one + e.c.move;
    expect(sum).toBeCloseTo(e.tot, 6);
    expect(e.meta.degraded).toEqual([]);
    expect(e.meta.demo).toBe(true);
  });

  it("the student's own costs appear in living and one-off, and in the total", async () => {
    const engine = createEngine(deps, "engine-test");
    await engine.ready(input);
    const base = engine.estimate({ ...input, extras: [] });
    const withExtras = engine.estimate(input);
    expect(withExtras.exO).toBe(1200);
    expect(withExtras.exM).toBe(40);
    expect(withExtras.c.one - base.c.one).toBeCloseTo(1200, 6);
    // Monthly costs run over the months the student is there (the engine's calendar), not a
    // flat 12 a year: a whole number of months, at most 24.
    const gymMonths = (withExtras.c.live - base.c.live) / 40;
    expect(gymMonths).toBeGreaterThanOrEqual(16);
    expect(gymMonths).toBeLessThanOrEqual(24);
    expect(Math.abs(gymMonths - Math.round(gymMonths))).toBeLessThan(1e-6);
    // The total also carries the transfer cost of sending that money, so it rises by more.
    expect(withExtras.tot - base.tot).toBeGreaterThan(1200 + 40 * gymMonths);
  });

  it("the exchange-rate range brackets today's rate and has one point per month", async () => {
    const engine = createEngine(deps, "engine-test");
    await engine.ready(input);
    const fx = engine.estimate(input).fx;
    expect(fx).not.toBeNull();
    if (!fx) return;
    const base = fx.today[fx.H - 1] ?? 0;
    expect(fx.H).toBe(24);
    expect(fx.today).toHaveLength(24);
    // The band is ordered, and "set aside" is the gap from today's rate to its worst tenth.
    // (lo <= base holds only when the currency has strengthened in some past window; the demo
    // history only weakens, so even the best tenth sits above today's rate there.)
    expect(fx.lo).toBeLessThanOrEqual(fx.hi);
    expect(fx.hi).toBeGreaterThan(base);
    expect(fx.buf).toBeCloseTo(fx.hi - base, 6);
    expect(fx.p10[fx.H - 1]).toBeCloseTo(fx.lo, 6);
    expect(fx.p90[fx.H - 1]).toBeCloseTo(fx.hi, 6);
    for (let m = 1; m < fx.H; m++) expect(fx.today[m]).toBeGreaterThanOrEqual(fx.today[m - 1] ?? 0);
  });

  it("gives the same totals as the server-side estimate for the same inputs", async () => {
    const engine = createEngine(deps, "engine-test");
    await engine.ready(input);
    const page = engine.estimate(input);
    const req = EstimateRequestSchema.parse({
      countryCode: "IN",
      homeCurrency: "INR",
      school: NYU,
      tuitionPerYear: 65_622,
      tuitionSource: "school",
      degreeYears: 2,
      startTerm: { year: 2027, season: "fall" },
      options: {
        customCosts: [
          { label: "Laptop", amount: 1200, currency: "USD", frequency: "one_off" },
          { label: "Gym", amount: 40, currency: "USD", frequency: "monthly" },
        ],
      },
    });
    const server = await runEstimate(req, mockSources, NOW);
    const t = server.estimate.totals;
    expect(page.tot).toBeCloseTo(t.total / 100, 6);
    expect(page.c.tui).toBeCloseTo(t.tuition / 100, 6);
    expect(page.c.house).toBeCloseTo(t.housing / 100, 6);
    expect(page.c.live).toBeCloseTo((t.living + t.healthInsurance) / 100, 6);
    expect(page.c.one).toBeCloseTo(t.oneOff / 100, 6);
    expect(page.c.move).toBeCloseTo(t.moneyMoving / 100, 6);
    expect(server.estimate.fx.kind).toBe("replay");
    if (server.estimate.fx.kind === "replay" && page.fx) {
      expect(page.fx.lo).toBeCloseTo(server.estimate.fx.best10Home / 100, 6);
      expect(page.fx.hi).toBeCloseTo(server.estimate.fx.worst10Home / 100, 6);
      expect(page.fx.n).toBe(server.estimate.fx.windows.length);
    }
    expect(page.lines.map((l) => l.id).sort()).toEqual(
      server.estimate.items.map((i) => i.id).sort(),
    );
  });

  it("without a loaded school or rates, every line is a labelled estimate in dollars", () => {
    const engine = createEngine(deps, "engine-test");
    const e = engine.estimate({ ...input, school: "Somewhere University", currency: "USD" });
    expect(e.meta.degraded).toEqual(["school", "rent"]);
    expect(e.fx).toBeNull();
    expect(e.tot).toBeGreaterThan(e.c.tui);
    expect(e.lines.some((l) => l.confidence === "estimate")).toBe(true);
  });

  it("formats any supported currency the way the app does, and keeps lakh and crore", () => {
    const engine = createEngine(deps, "engine-test");
    expect(engine.format(12_748_295, "INR", "big")).toBe("₹1.27 crore");
    expect(engine.format(7_151_250, "INR", "big")).toBe("₹71.5 lakh");
    expect(engine.format(7_151_250, "INR", "full")).toBe("₹71,51,250");
    expect(engine.format(133_700_000, "KRW", "full")).toBe("₩133,700,000");
    expect(engine.format(133_700_000, "KRW", "short")).toBe("₩133.7M");
    expect(engine.format(715_125, "BRL", "full")).toMatch(/^R\$\s?715\.125$/);
    expect(engine.symbol("KRW")).toBe("₩");
    expect(engine.symbol("BDT")).toBe("৳");
    expect(engine.format(100, "XXX", "full")).toBe("XXX 100");
  });

  it("bundles to a classic script that defines window.TPEngine", async () => {
    const result = await buildEngine({ write: false, minify: false });
    expect(result.errors).toEqual([]);
    const code = result.outputFiles?.[0]?.text ?? "";
    expect(code.length).toBeGreaterThan(10_000);
    const sandbox: {
      window: { TPEngine?: { version: string; rates: () => Record<string, number> } };
    } = {
      window: {},
    };
    runInNewContext(code, sandbox);
    expect(sandbox.window.TPEngine?.version).toMatch(/^engine-\d+\.\d+\.\d+$/);
    expect(sandbox.window.TPEngine?.rates().INR).toBeGreaterThan(50);
  });
});
