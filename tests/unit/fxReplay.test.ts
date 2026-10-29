import { describe, expect, it } from "vitest";
import { baselineTotal, replay, whatIf } from "@/lib/core/fxReplay";
import { usd } from "@/lib/core/money";
import type { PaymentEvent } from "@/lib/core/types";
import { INR_HISTORY, syntheticHistory } from "../fixtures/fxHistory";

const today = { date: "2026-10-29", rate: 95.27, source: "Frankfurter blended" };
const schedule: PaymentEvent[] = [
  {
    date: "2027-08-15",
    phase: "arrival",
    amountUsd: usd(20000),
    itemIds: ["tuition"],
    transferFeeUsd: usd(315),
  },
  {
    date: "2028-01-15",
    phase: "ongoing",
    amountUsd: usd(20000),
    itemIds: ["tuition"],
    transferFeeUsd: usd(315),
  },
  {
    date: "2028-08-15",
    phase: "ongoing",
    amountUsd: usd(20000),
    itemIds: ["tuition"],
    transferFeeUsd: usd(315),
  },
  {
    date: "2029-01-15",
    phase: "ongoing",
    amountUsd: usd(20000),
    itemIds: ["tuition"],
    transferFeeUsd: usd(315),
  },
];

describe("replay", () => {
  it("prices the baseline at today's rate and orders best, median and worst", () => {
    const r = replay({ schedule, today, history: INR_HISTORY, minorDigits: 2, asOf: today.date });
    expect(r.kind).toBe("replay");
    if (r.kind !== "replay") return;
    expect(r.baselineHome).toBe(baselineTotal(schedule, today.rate, 2));
    expect(r.best.totalHome).toBeLessThanOrEqual(r.best10Home);
    expect(r.best10Home).toBeLessThanOrEqual(r.medianHome);
    expect(r.medianHome).toBeLessThanOrEqual(r.worst10Home);
    expect(r.worst10Home).toBeLessThanOrEqual(r.worst.totalHome);
    expect(r.windows.length).toBeGreaterThan(100);
    expect(r.worst.end <= r.historyTo).toBe(true);
  });

  it("is relative: a flat history reproduces the baseline in every window", () => {
    const flat = syntheticHistory({
      from: "2015-01-01",
      to: "2026-10-29",
      startRate: 80,
      driftPerYear: 0,
      waveAmplitude: 0,
    });
    const r = replay({ schedule, today, history: flat, minorDigits: 2, asOf: today.date });
    if (r.kind !== "replay") throw new Error(r.reasonId);
    expect(r.medianHome).toBe(r.baselineHome);
    expect(r.worst.totalHome).toBe(r.baselineHome);
  });

  it("reports unsupported reasons honestly", () => {
    expect(
      replay({ schedule, today, history: [], minorDigits: 2, asOf: today.date }),
    ).toMatchObject({ kind: "unsupported", reasonId: "no_history" });
    const short = syntheticHistory({
      from: "2026-01-01",
      to: "2026-10-29",
      startRate: 80,
      driftPerYear: 0,
      waveAmplitude: 0,
    });
    expect(
      replay({ schedule, today, history: short, minorDigits: 2, asOf: today.date }),
    ).toMatchObject({ kind: "unsupported", reasonId: "history_too_short" });
    expect(
      replay({
        schedule,
        today,
        history: INR_HISTORY,
        minorDigits: 2,
        asOf: today.date,
        payFromUsd: true,
      }),
    ).toMatchObject({ kind: "unsupported", reasonId: "pay_from_usd" });
  });

  it("what-if moves the rate linearly to the last payment", () => {
    const base = whatIf(schedule, today, 0, 2, today.date);
    const weaker = whatIf(schedule, today, 10, 2, today.date);
    const stronger = whatIf(schedule, today, -10, 2, today.date);
    expect(base).toBe(baselineTotal(schedule, today.rate, 2));
    expect(weaker).toBeGreaterThan(base);
    expect(stronger).toBeLessThan(base);
    // Only the last payment is at the full +10%; earlier ones less, so the total rises by under 10%.
    expect(weaker).toBeLessThan(base * 1.1);
  });
});
