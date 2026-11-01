import { cents, clampNonNegative } from "./money";
import type { Cents, Derivation, FormulaId, Term } from "./types";

// The only place a formula is evaluated. Item builders call `derive` and use the amount it
// returns, so the derivation and the amount can never disagree (ADR 015). Rounding happens
// once, through the same helpers as before: `cents` after each multiplication.

const money = (terms: Term[]): number[] =>
  terms.filter((t) => t.unit === "usd").map((t) => t.value);
const factors = (terms: Term[]): number[] =>
  terms.filter((t) => t.unit === "count" || t.unit === "nights").map((t) => t.value);

export function evaluate(formula: FormulaId, terms: Term[]): Cents {
  const m = money(terms);
  switch (formula) {
    case "given":
      return cents(m[0] ?? 0);
    case "product":
      return cents(factors(terms).reduce((p, f) => p * f, m[0] ?? 0));
    case "quotient": {
      const people = terms.find((t) => t.unit === "people")?.value ?? 1;
      return cents((m[0] ?? 0) * (1 / people));
    }
    case "difference":
    case "deducted":
      return clampNonNegative(cents((m[0] ?? 0) - (m[1] ?? 0)));
  }
}

export function derive(
  formula: FormulaId,
  terms: Term[],
): { derivation: Derivation; amountUsd: Cents } {
  const result = evaluate(formula, terms);
  return { derivation: { formula, terms, result }, amountUsd: result };
}

/** A term in US cents. */
export const usdTerm = (label: string, value: Cents, sourceId?: Term["sourceId"]): Term => ({
  label,
  value,
  unit: "usd",
  ...(sourceId ? { sourceId } : {}),
});
export const countTerm = (label: string, value: number): Term => ({ label, value, unit: "count" });
