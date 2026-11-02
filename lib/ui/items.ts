import { occurrencesOverDegree } from "@/lib/core/calendar";
import type { Cents, LineItem } from "@/lib/core/types";

/** A line's total over the degree, for display. Client-safe: no engine import. */
export function degreeTotalOf(item: LineItem, years: number): Cents {
  if (item.riskOnly || item.timingOnly) return 0 as Cents;
  return Math.round(item.amountUsd * occurrencesOverDegree(item, years)) as Cents;
}
