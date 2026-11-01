import { occurrencesOverDegree } from "./calendar";
import { cents } from "./money";
import type { Cents, EstimateInput, LineItem } from "./types";

// A deduction takes a stated amount off one cost line over the degree (a student deal switched
// on). It is spread evenly over the line's occurrences and can never push the line below zero,
// so a deal is worth at most what the line costs.

export function applyDeductions(items: LineItem[], input: EstimateInput): LineItem[] {
  const deductions = input.options.deductions ?? [];
  if (deductions.length === 0) return items;
  const byLine = new Map<string, number>();
  for (const d of deductions) byLine.set(d.lineId, (byLine.get(d.lineId) ?? 0) + d.amountUsd);
  return items.map((item) => {
    const overDegree = byLine.get(item.id);
    if (!overDegree || item.riskOnly || item.timingOnly) return item;
    const occurrences = occurrencesOverDegree(item, input.degreeYears);
    if (occurrences === 0) return item;
    const perOccurrence = cents(overDegree / occurrences);
    const amountUsd = Math.max(0, item.amountUsd - perOccurrence) as Cents;
    return { ...item, amountUsd, noteId: item.noteId ?? "deal_applied" };
  });
}
