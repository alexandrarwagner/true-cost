import type { RatePoint } from "@/lib/core/types";

/**
 * Deterministic synthetic daily history for DEMO_MODE, tests and golden scenarios: a slow drift plus a
 * slow wave, so windows differ from each other but nothing depends on live data.
 */
export function syntheticHistory(opts: {
  from: string;
  to: string;
  startRate: number;
  driftPerYear: number;
  waveAmplitude: number;
}): RatePoint[] {
  const out: RatePoint[] = [];
  const start = Date.parse(`${opts.from}T00:00:00Z`);
  const end = Date.parse(`${opts.to}T00:00:00Z`);
  for (let t = start, i = 0; t <= end; t += 86_400_000, i++) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const years = i / 365;
    const rate =
      opts.startRate *
      (1 + opts.driftPerYear * years) *
      (1 + opts.waveAmplitude * Math.sin((2 * Math.PI * i) / 900));
    out.push({ date: d.toISOString().slice(0, 10), rate: Number(rate.toFixed(4)) });
  }
  return out;
}

export const SAMPLE_INR_HISTORY = syntheticHistory({
  from: "2010-01-01",
  to: "2026-10-29",
  startRate: 46.5,
  driftPerYear: 0.045,
  waveAmplitude: 0.04,
});
export const SAMPLE_KRW_HISTORY = syntheticHistory({
  from: "2010-01-01",
  to: "2026-10-29",
  startRate: 1160,
  driftPerYear: 0.01,
  waveAmplitude: 0.05,
});
