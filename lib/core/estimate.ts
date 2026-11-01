import { occurrencesOverDegree } from "./calendar";
import { buildLineItems, type CostModelData } from "./costModel";
import { applyDeductions } from "./deductions";
import { replay } from "./fxReplay";
import { addCents, mulCents } from "./money";
import { buildSchedule, transferOptionsFor } from "./schedule";
import type {
  Category,
  Cents,
  Estimate,
  EstimateInput,
  LineItem,
  RatePoint,
  Source,
  Totals,
} from "./types";

// The one pure entry point. Everything the data layer fetched comes in as arguments.

export interface EstimateContext extends CostModelData {
  /** As-of date for the schedule and the replay, YYYY-MM-DD. */
  today: string;
  fx?: {
    today: RatePoint & { source: string };
    history: RatePoint[];
    minorDigits: number;
  };
}

export { occurrencesOverDegree };

export function degreeTotal(item: LineItem, years: number): Cents {
  if (item.riskOnly || item.timingOnly) return 0 as Cents;
  return mulCents(item.amountUsd, occurrencesOverDegree(item, years));
}

export function computeTotals(items: LineItem[], years: number, moneyMoving: Cents): Totals {
  const by: Record<Category, Cents> = {
    tuition: 0 as Cents,
    housing: 0 as Cents,
    living: 0 as Cents,
    one_off: 0 as Cents,
    money_moving: moneyMoving,
  };
  for (const item of items)
    by[item.category] = addCents(by[item.category], degreeTotal(item, years));
  const total = addCents(by.tuition, by.housing, by.living, by.one_off, by.money_moving);
  const hiddenPercentOfTuition =
    by.tuition > 0 ? Math.round(((total - by.tuition) / by.tuition) * 100) : 0;
  return {
    tuition: by.tuition,
    housing: by.housing,
    living: by.living,
    oneOff: by.one_off,
    moneyMoving: by.money_moving,
    total,
    hiddenPercentOfTuition,
  };
}

function uniqueSources(items: LineItem[], extra: Source[]): Source[] {
  const seen = new Map<string, Source>();
  for (const s of [...items.map((i) => i.source), ...extra])
    seen.set(`${s.kind}|${s.name}|${s.url ?? ""}|${s.date}`, s);
  return [...seen.values()];
}

export function computeEstimate(input: EstimateInput, ctx: EstimateContext): Estimate {
  const payFromUsd = input.options.payFromUsd === true;
  const built = buildLineItems(input, { school: ctx.school, rent: ctx.rent }, ctx.today);
  const model = { ...built, items: applyDeductions(built.items, input) };
  const schedule = buildSchedule(model.items, input, {
    transfer: transferOptionsFor(input),
    payFromUsd,
  });
  const moneyMoving = addCents(...schedule.map((e) => e.transferFeeUsd));
  const totals = computeTotals(model.items, input.degreeYears, moneyMoving);

  const extraSources: Source[] = [];
  let fx: Estimate["fx"];
  if (!ctx.fx) {
    fx = { kind: "unsupported", reasonId: "no_history" };
  } else {
    fx = replay({
      schedule,
      today: ctx.fx.today,
      history: ctx.fx.history,
      minorDigits: ctx.fx.minorDigits,
      asOf: ctx.today,
      payFromUsd,
    });
    extraSources.push({ kind: "government", name: ctx.fx.today.source, date: ctx.fx.today.date });
  }
  const noteIds = [...model.noteIds];
  if (payFromUsd) noteIds.push("pay_from_usd");
  if (!input.options.transfer && !payFromUsd) noteIds.push("transfer_assumption");

  return {
    input,
    items: model.items,
    totals,
    schedule,
    fx,
    sources: uniqueSources(model.items, extraSources),
    noteIds,
  };
}
