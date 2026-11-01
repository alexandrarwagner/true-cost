import { copy } from "@/content/copy";
import { degreeTotal, occurrencesOverDegree } from "@/lib/core/estimate";
import type { Cents, LineItem, Term } from "@/lib/core/types";
import { usdFmt } from "./format";

// Sentences for the full-calculation page, filled from each item's derivation. Templates
// only: nothing here computes a number, and nothing is written by an AI (ADR 015).

const label = (t: Term): string => copy.terms[t.label] ?? t.label.replace(/_/g, " ");

function termText(t: Term): string {
  switch (t.unit) {
    case "usd":
      return `${usdFmt(t.value as Cents)} ${label(t)}`;
    case "people":
      return `${t.value} ${t.value === 1 ? copy.breakdown.person : copy.breakdown.people}`;
    case "nights":
      return `${t.value} ${t.value === 1 ? copy.breakdown.night : copy.breakdown.nights}`;
    case "home":
      return `${t.value.toLocaleString("en-US")} ${label(t)}`;
    case "rate":
      return `${t.value} ${label(t)}`;
    case "count":
    case "months":
      return `${t.value} ${label(t)}`;
  }
}

export interface ItemSentences {
  /** The per-occurrence formula, e.g. "$3,100 the area's rent ÷ 3 people = $1,033". */
  formula: string;
  /** How that repeats over the degree, e.g. "× 20 months over 2 years = $20,667". */
  overDegree: string;
}

export function itemSentences(item: LineItem, years: number): ItemSentences {
  const d = item.derivation;
  const t = copy.breakdown;
  const money = d.terms.filter((x) => x.unit === "usd");
  const factors = d.terms.filter((x) => x.unit === "count" || x.unit === "nights");
  const result = usdFmt(d.result);
  let formula: string;
  switch (d.formula) {
    case "given":
      formula = d.terms[0] ? `${termText(d.terms[0])}` : result;
      if (d.terms.length > 1) formula += ` (${d.terms.slice(1).map(termText).join(", ")})`;
      break;
    case "product":
      formula = `${[...(money[0] ? [termText(money[0])] : []), ...factors.map(termText)].join(" × ")} = ${result}`;
      break;
    case "quotient": {
      const people = d.terms.find((x) => x.unit === "people");
      formula = `${money[0] ? termText(money[0]) : ""} ÷ ${people ? termText(people) : ""} = ${result}`;
      break;
    }
    case "difference":
    case "deducted":
      formula = `${money[0] ? termText(money[0]) : ""} − ${money[1] ? termText(money[1]) : ""} = ${result}`;
      break;
  }
  const n = occurrencesOverDegree(item, years);
  const total = degreeTotal(item, years);
  const overDegree =
    item.riskOnly || item.timingOnly
      ? item.riskOnly
        ? t.riskOnly
        : t.timingOnly
      : item.frequency === "one_off"
        ? t.once
        : t.overDegree(
            n,
            copy.breakdown.occurrence[item.frequency] ?? item.frequency,
            years,
            usdFmt(total),
          );
  return { formula, overDegree };
}
