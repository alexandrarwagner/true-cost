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

// Lays the line items out in time: when each payment is due and what moving the money costs.

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

export function buildSchedule(
  items: LineItem[],
  input: EstimateInput,
  opts: ScheduleOptions,
): PaymentEvent[] {
  const years = academicYears(input.startTerm, input.degreeYears);
  const start = startDate(input.startTerm);
  const end = programmeEnd(input.startTerm, input.degreeYears);
  const pending: Pending[] = [];

  const deposit = items.find((i) => i.id === "enrolmentDeposit");
  const lastMonthUpfront = items.find((i) => i.id === "lastMonthRentUpfront");

  for (const item of items) {
    if (item.riskOnly) continue;
    switch (item.frequency) {
      case "one_off": {
        const date =
          item.phase === "pre_arrival"
            ? addDays(start, -PRE_ARRIVAL_DAYS_BEFORE_START)
            : item.phase === "arrival"
              ? start
              : item.phase === "departure"
                ? end
                : start;
        pending.push({ date, phase: item.phase, amount: item.amountUsd, itemId: item.id });
        break;
      }
      case "per_year": {
        for (const y of years) {
          if (item.id === "tuition") {
            const perSemester = mulCents(item.amountUsd, 1 / SEMESTERS_PER_YEAR);
            y.semesterDates.forEach((date, s) => {
              let amount = perSemester;
              // The enrolment deposit was paid earlier and is credited against the first bill.
              if (y.index === 0 && s === 0 && deposit)
                amount = cents(Math.max(0, amount - deposit.amountUsd));
              pending.push({
                date,
                phase: s === 0 && y.index === 0 ? "arrival" : "ongoing",
                amount,
                itemId: item.id,
              });
            });
          } else if (item.id === "books") {
            const perSemester = mulCents(item.amountUsd, 1 / SEMESTERS_PER_YEAR);
            y.semesterDates.forEach((date, s) =>
              pending.push({
                date,
                phase: s === 0 && y.index === 0 ? "arrival" : "ongoing",
                amount: perSemester,
                itemId: item.id,
              }),
            );
          } else if (item.id === "flightsHome") {
            // Trips home cluster around the winter break.
            const [, spring] = y.semesterDates;
            pending.push({
              date: addDays(spring, -14),
              phase: "ongoing",
              amount: item.amountUsd,
              itemId: item.id,
            });
          } else {
            const date = y.semesterDates[0];
            pending.push({
              date,
              phase: y.index === 0 ? "arrival" : "ongoing",
              amount: item.amountUsd,
              itemId: item.id,
            });
          }
        }
        break;
      }
      case "per_semester": {
        for (const y of years)
          y.semesterDates.forEach((date, s) =>
            pending.push({
              date,
              phase: s === 0 && y.index === 0 ? "arrival" : "ongoing",
              amount: item.amountUsd,
              itemId: item.id,
            }),
          );
        break;
      }
      case "per_month": {
        for (const y of years) {
          if (item.id === "summerRent") {
            for (const date of y.summerMonths) {
              pending.push({
                date,
                phase: y.isFinal ? "departure" : "ongoing",
                amount: item.amountUsd,
                itemId: y.isFinal ? "overlapRent" : item.id,
              });
            }
            continue;
          }
          y.livingMonths.forEach((date, m) => {
            let amount = item.amountUsd;
            // Last month's rent paid upfront covers the final month.
            if (
              item.id === "rent" &&
              lastMonthUpfront &&
              y.isFinal &&
              m === y.livingMonths.length - 1
            )
              amount = 0 as Cents;
            pending.push({
              date,
              phase: m === 0 && y.index === 0 ? "arrival" : "ongoing",
              amount,
              itemId: item.id,
            });
          });
        }
        break;
      }
    }
  }

  // Merge same-day payments into one transfer, which is how families actually pay.
  const byDate = new Map<string, Pending[]>();
  for (const p of pending) {
    if (p.amount <= 0) continue;
    const list = byDate.get(p.date) ?? [];
    list.push(p);
    byDate.set(p.date, list);
  }
  const events: PaymentEvent[] = [];
  for (const [date, list] of [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const amount = addCents(...list.map((p) => p.amount));
    const phase = list.some((p) => p.phase === "pre_arrival")
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
