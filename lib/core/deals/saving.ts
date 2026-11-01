import { cents } from "../money";
import type { Cents, DegreeYears, IsoDate } from "../types";
import type { CostLineId, Deal, DealCategory, DealPeriod } from "./types";

// What a deal is worth over the degree, from the source's own prices. No estimates: when a
// price is missing, there is no figure, and the deal still shows as a tip.

/** Approved deals checked longer ago than this are hidden until someone re-checks them. */
export const DEAL_MAX_AGE_DAYS = 90;

/** The destination currency; deals priced in anything else carry no figure in v1. */
const DESTINATION_CURRENCY = "USD";

const LINE_BY_CATEGORY: Partial<Record<DealCategory, CostLineId>> = {
  software: "otherExpenses",
  subscriptions: "otherExpenses",
  culture: "otherExpenses",
  fitness: "otherExpenses",
  other: "otherExpenses",
  food: "food",
};

export const costLineOf = (deal: Deal): CostLineId | undefined =>
  deal.costLine ?? LINE_BY_CATEGORY[deal.category];

export function periodsOverDegree(period: DealPeriod, years: DegreeYears): number {
  switch (period) {
    case "month":
      return 12 * years;
    case "year":
      return years;
    case "once":
      return 1;
  }
}

/** Regular minus student price per period, or undefined unless the source gives both in USD. */
export function savingPerPeriod(deal: Deal): Cents | undefined {
  const { studentPrice: s, regularPrice: r } = deal;
  if (!s || !r || !deal.period) return undefined;
  if (s.currency !== DESTINATION_CURRENCY || r.currency !== DESTINATION_CURRENCY) return undefined;
  if (r.amount <= s.amount) return undefined;
  return cents(r.amount - s.amount);
}

/** The deal's stated saving over the whole degree, before any cap at the line's total. */
export function savingOverDegree(deal: Deal, years: DegreeYears): Cents | undefined {
  const per = savingPerPeriod(deal);
  if (per === undefined || !deal.period) return undefined;
  return cents(per * periodsOverDegree(deal.period, years));
}

export function ageInDays(checkedOn: IsoDate, today: IsoDate): number {
  return Math.floor(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${checkedOn}T00:00:00Z`)) / 86_400_000,
  );
}

/** Approved and checked within the last DEAL_MAX_AGE_DAYS. The only filter that shows a deal. */
export function isShowable(deal: Deal, today: IsoDate): boolean {
  if (deal.status !== "approved") return false;
  const age = ageInDays(deal.checkedOn, today);
  // A check dated "tomorrow" (a reviewer ahead of UTC) still counts; only old checks hide.
  return Number.isFinite(age) && age <= DEAL_MAX_AGE_DAYS;
}
