import { addDays, daysBetween } from "./calendar";
import { addMinor, median, percentile, toMinor } from "./money";
import type {
  FxPathPoint,
  FxReplay,
  FxUnsupported,
  FxWindow,
  IsoDate,
  Minor,
  PaymentEvent,
  RatePoint,
} from "./types";

// Historical replay. We never predict. For every past window as long as the payment plan, we
// apply that window's relative rate moves to today's rate and re-price every payment.

export interface ReplayInput {
  schedule: PaymentEvent[];
  today: RatePoint & { source: string };
  /** Daily (business-day) history, ascending by date, home units per USD. */
  history: RatePoint[];
  minorDigits: number;
  /** The date payments are measured from; payments before it are treated as due now. */
  asOf: IsoDate;
  /** Start a new window every this many history rows (7 ≈ weekly). */
  windowStepRows?: number;
  payFromUsd?: boolean;
}

export const MIN_WINDOWS = 12;

function amountDue(e: PaymentEvent): number {
  return e.amountUsd + e.transferFeeUsd;
}

/** Index of the last history row dated on or before `date`, or -1. */
function lastOnOrBefore(history: RatePoint[], date: IsoDate): number {
  let lo = 0;
  let hi = history.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const row = history[mid];
    if (row && row.date <= date) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export function baselineTotal(schedule: PaymentEvent[], rate: number, minorDigits: number): Minor {
  return addMinor(...schedule.map((e) => toMinor(amountDue(e) as never, rate, minorDigits)));
}

export function replay(input: ReplayInput): FxReplay | FxUnsupported {
  const todayWithSource = input.today;
  const baselineHome = baselineTotal(input.schedule, todayWithSource.rate, input.minorDigits);
  if (input.payFromUsd)
    return { kind: "unsupported", reasonId: "pay_from_usd", today: todayWithSource, baselineHome };
  if (input.history.length === 0)
    return { kind: "unsupported", reasonId: "no_history", today: todayWithSource, baselineHome };

  const offsets = input.schedule.map((e) => ({
    days: Math.max(0, daysBetween(input.asOf, e.date)),
    amount: amountDue(e),
  }));
  const span = Math.max(0, ...offsets.map((o) => o.days));
  const first = input.history[0];
  const last = input.history[input.history.length - 1];
  if (!first || !last)
    return { kind: "unsupported", reasonId: "no_history", today: todayWithSource, baselineHome };

  const step = Math.max(1, input.windowStepRows ?? 7);
  const windows: FxWindow[] = [];
  const perWindowCumulative: number[][] = [];
  for (let i = 0; i < input.history.length; i += step) {
    const startRow = input.history[i];
    if (!startRow || !(startRow.rate > 0)) continue;
    const endDate = addDays(startRow.date, span);
    if (endDate > last.date) break;
    let total = 0;
    const cumulative: number[] = [];
    for (const o of offsets) {
      const idx = lastOnOrBefore(input.history, addDays(startRow.date, o.days));
      const row = input.history[idx];
      if (!row || !(row.rate > 0)) {
        total = -1;
        break;
      }
      const relRate = (todayWithSource.rate * row.rate) / startRow.rate;
      total += toMinor(o.amount as never, relRate, input.minorDigits);
      cumulative.push(total);
    }
    if (total >= 0) {
      windows.push({ start: startRow.date, end: endDate, totalHome: total as Minor });
      perWindowCumulative.push(cumulative);
    }
  }

  if (windows.length < MIN_WINDOWS)
    return {
      kind: "unsupported",
      reasonId: "history_too_short",
      today: todayWithSource,
      baselineHome,
    };

  const totals = windows.map((w) => w.totalHome).sort((a, b) => a - b);
  let running = 0;
  const path: FxPathPoint[] = input.schedule.map((e, i) => {
    running += toMinor(amountDue(e) as never, todayWithSource.rate, input.minorDigits);
    const column = perWindowCumulative.map((c) => c[i] ?? 0).sort((a, b) => a - b);
    return {
      date: e.date,
      baseline: running as Minor,
      best10: percentile(column, 0.1) as Minor,
      median: median(column) as Minor,
      worst10: percentile(column, 0.9) as Minor,
    };
  });
  const worst = windows.reduce((a, b) => (b.totalHome > a.totalHome ? b : a));
  const best = windows.reduce((a, b) => (b.totalHome < a.totalHome ? b : a));
  return {
    kind: "replay",
    today: todayWithSource,
    baselineHome,
    windows,
    medianHome: median(totals) as Minor,
    best10Home: percentile(totals, 0.1) as Minor,
    worst10Home: percentile(totals, 0.9) as Minor,
    worst,
    best,
    path,
    historyFrom: first.date,
    historyTo: last.date,
  };
}

/**
 * What-if: the home currency weakens (positive percent) or strengthens (negative) by
 * `percent` by the last payment, moving in a straight line from today. Not a prediction.
 */
export function whatIf(
  schedule: PaymentEvent[],
  today: RatePoint,
  percent: number,
  minorDigits: number,
  asOf: IsoDate,
): Minor {
  const offsets = schedule.map((e) => ({
    days: Math.max(0, daysBetween(asOf, e.date)),
    amount: amountDue(e),
  }));
  const span = Math.max(1, ...offsets.map((o) => o.days));
  return addMinor(
    ...offsets.map((o) => {
      const rate = today.rate * (1 + (percent / 100) * (o.days / span));
      return toMinor(o.amount as never, rate, minorDigits);
    }),
  );
}
