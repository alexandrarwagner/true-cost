import type { FxReplay, IsoDate } from "@/lib/core/types";
import type { PageFx } from "./contract";

/** `months` calendar months after `date`, ISO. */
function addMonths(date: IsoDate, months: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * The fan chart reads cumulative spend by month (12 per year) in home units. The engine's
 * path is per payment; each month takes the last payment on or before its end, and the
 * final month carries everything, so later payments (a departure cost) are never dropped.
 */
export function toPageFx(
  fx: FxReplay,
  years: number,
  asOf: IsoDate,
  minorDigits: number,
  usdTotal: number,
): PageFx {
  const unit = Math.pow(10, minorDigits);
  const H = 12 * years;
  const today: number[] = [];
  const p10: number[] = [];
  const p90: number[] = [];
  const worst: number[] = [];
  const last = fx.path[fx.path.length - 1];
  for (let m = 0; m < H; m++) {
    const end = addMonths(asOf, m + 1);
    let point = m === H - 1 ? last : undefined;
    if (!point) for (const p of fx.path) if (p.date <= end) point = p;
    today.push((point?.baseline ?? 0) / unit);
    p10.push((point?.best10 ?? 0) / unit);
    p90.push((point?.worst10 ?? 0) / unit);
    worst.push((point?.worstMean ?? 0) / unit);
  }
  return {
    today,
    p10,
    p90,
    worst,
    n: fx.windows.length,
    H,
    buf: (fx.worst10Home - fx.baselineHome) / unit,
    lo: fx.best10Home / unit,
    hi: fx.worst10Home / unit,
    usdTotal,
  };
}
