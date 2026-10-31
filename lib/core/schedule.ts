import { TRANSFER_DEFAULT } from "@/data/constants";
import {
  academicYears,
  addDays,
  PRE_ARRIVAL_DAYS_BEFORE_START,
  programmeEnd,
  SEMESTERS_PER_YEAR,
  startDate,
} from "./calendar";
import { addCents, bps, cents, mulCents } from "./money";
import type { Cents, EstimateInput, LineItem, PaymentEvent, Phase, TransferOptions } from "./types";

// Lays the line items out in time by their `billing`, applies deposit credits, merges
// same-day payments into one transfer, and prices each transfer.

export interface ScheduleOptions {
  transfer: TransferOptions;
  /** No markup or fees when paying from a US dollar account. */
  payFromUsd: boolean;
}

interface Pending {
  date: string;
  phase: Phase;
  amount: Cents;
  itemId: string;
}

export function transferOptionsFor(input: EstimateInput): TransferOptions {
  return (
    input.options.transfer ?? {
      markupBps: TRANSFER_DEFAULT.markupBps,
      fixedFeeUsd: TRANSFER_DEFAULT.fixedFeeUsd,
    }
  );
}

function inScope(item: LineItem, isFinal: boolean): boolean {
  const scope = item.yearScope ?? "all";
  return scope === "all" || (scope === "final") === isFinal;
}

/** Batch payments into the latest batch date on or before each one (the first for earlier ones). */
function batched(list: Pending[], batchDates: readonly string[]): Pending[] {
  const byBatch = new Map<string, Pending>();
  for (const p of list) {
    const date = [...batchDates].reverse().find((d) => d <= p.date) ?? batchDates[0] ?? p.date;
    const hit = byBatch.get(date);
    if (hit) hit.amount = addCents(hit.amount, p.amount);
    else byBatch.set(date, { ...p, date });
  }
  return [...byBatch.values()];
}

/** Expand one item into dated payments, before credits. */
function occurrences(item: LineItem, input: EstimateInput): Pending[] {
  const perSemester = input.options.transferCadence === "semester";
  const years = academicYears(input.startTerm, input.degreeYears);
  const start = startDate(input.startTerm);
  const end = programmeEnd(input.startTerm, input.degreeYears);
  const firstPhase = (yearIndex: number, i: number): Phase =>
    yearIndex === 0 && i === 0 ? "arrival" : "ongoing";
  const out: Pending[] = [];
  switch (item.billing) {
    case "pre_arrival":
      return [
        {
          date: addDays(start, -PRE_ARRIVAL_DAYS_BEFORE_START),
          phase: "pre_arrival",
          amount: item.amountUsd,
          itemId: item.id,
        },
      ];
    case "arrival":
      return [{ date: start, phase: "arrival", amount: item.amountUsd, itemId: item.id }];
    case "departure":
      return [{ date: end, phase: "departure", amount: item.amountUsd, itemId: item.id }];
    case "semester": {
      const per =
        item.frequency === "per_year"
          ? mulCents(item.amountUsd, 1 / SEMESTERS_PER_YEAR)
          : item.amountUsd;
      for (const y of years)
        if (inScope(item, y.isFinal))
          y.semesterDates.forEach((date, s) =>
            out.push({ date, phase: firstPhase(y.index, s), amount: per, itemId: item.id }),
          );
      return out;
    }
    case "year_start":
      for (const y of years)
        if (inScope(item, y.isFinal))
          out.push({
            date: y.semesterDates[0],
            phase: firstPhase(y.index, 0),
            amount: item.amountUsd,
            itemId: item.id,
          });
      return out;
    case "winter_break":
      // Trips home cluster around the winter break, two weeks before the spring semester.
      for (const y of years)
        if (inScope(item, y.isFinal))
          out.push({
            date: addDays(y.semesterDates[1], -14),
            phase: "ongoing",
            amount: item.amountUsd,
            itemId: item.id,
          });
      return out;
    case "monthly":
      for (const y of years) {
        if (!inScope(item, y.isFinal)) continue;
        const months = y.livingMonths.map((date, m) => ({
          date,
          phase: firstPhase(y.index, m),
          amount: item.amountUsd,
          itemId: item.id,
        }));
        out.push(...(perSemester ? batched(months, y.semesterDates) : months));
      }
      return out;
    case "summer":
      for (const y of years) {
        if (!inScope(item, y.isFinal)) continue;
        const months = y.summerMonths.map((date) => ({
          date,
          phase: y.isFinal ? ("departure" as const) : ("ongoing" as const),
          amount: item.amountUsd,
          itemId: item.id,
        }));
        out.push(...(perSemester ? batched(months, y.summerMonths.slice(0, 1)) : months));
      }
      return out;
  }
}

/** Reduce the first or last payment of the credited item by the amount paid upfront. */
function applyCredits(pending: Pending[], items: LineItem[]): void {
  for (const item of items) {
    if (!item.creditAgainst) continue;
    const targets = pending.filter((p) => p.itemId === item.creditAgainst?.itemId);
    const target = item.creditAgainst.occurrence === "first" ? targets[0] : targets.at(-1);
    if (target) target.amount = cents(Math.max(0, target.amount - item.amountUsd));
  }
}

export function buildSchedule(
  items: LineItem[],
  input: EstimateInput,
  opts: ScheduleOptions,
): PaymentEvent[] {
  const pending = items.filter((i) => !i.riskOnly).flatMap((i) => occurrences(i, input));
  applyCredits(pending, items);

  // Merge same-day payments into one transfer, which is how families actually pay.
  const byDate = new Map<string, Pending[]>();
  for (const p of pending) {
    if (p.amount <= 0) continue;
    byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
  }
  const events: PaymentEvent[] = [];
  for (const [date, list] of [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const amount = addCents(...list.map((p) => p.amount));
    const phase: Phase = list.some((p) => p.phase === "pre_arrival")
      ? "pre_arrival"
      : list.some((p) => p.phase === "departure")
        ? "departure"
        : list.some((p) => p.phase === "arrival")
          ? "arrival"
          : "ongoing";
    const transferFeeUsd = opts.payFromUsd
      ? (0 as Cents)
      : addCents(bps(amount, opts.transfer.markupBps), opts.transfer.fixedFeeUsd);
    events.push({
      date,
      phase,
      amountUsd: amount,
      itemIds: [...new Set(list.map((p) => p.itemId))],
      transferFeeUsd,
    });
  }
  return events;
}
