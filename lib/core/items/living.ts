import { ESTIMATES } from "@/data/constants";
import { countTerm, derive, usdTerm } from "../derive";
import { mulCents } from "../money";
import type { Cents } from "../types";
import { empty, fromConstant, given, type ItemContext, type ItemGroup } from "./common";

/** Books and personal expenses (school figures first), and health insurance as its own category. */
export function livingItems(ctx: ItemContext): ItemGroup {
  const g = empty();
  const o = ctx.input.options;
  const onCampus = (o.housing?.kind ?? "on_campus") === "on_campus";
  const dependants = Math.max(0, Math.floor(o.dependants ?? 0));

  if (ctx.school?.booksSupplyUsd !== undefined) {
    g.items.push({
      id: "books",
      category: "living",
      ...given("school_books_figure", ctx.school.booksSupplyUsd, ctx.school.source),
      frequency: "per_year",
      phase: "ongoing",
      billing: "semester",
    });
  } else {
    g.items.push(
      fromConstant(ESTIMATES.booksPerYear, {
        id: "books",
        category: "living",
        frequency: "per_year",
        phase: "ongoing",
        billing: "semester",
      }),
    );
  }

  const other = onCampus
    ? ctx.school?.otherExpenseOnCampusUsd
    : ctx.school?.otherExpenseOffCampusUsd;
  if (other !== undefined && ctx.school) {
    g.items.push({
      id: "otherExpenses",
      category: "living",
      ...given("school_other_expenses_figure", other, ctx.school.source),
      frequency: "per_year",
      phase: "ongoing",
      billing: "year_start",
    });
  } else {
    g.items.push(
      fromConstant(ESTIMATES.otherExpensePerYear, {
        id: "otherExpenses",
        category: "living",
        frequency: "per_year",
        phase: "ongoing",
        billing: "year_start",
      }),
    );
  }

  if (o.insurance?.premiumPerYearUsd !== undefined) {
    g.items.push({
      id: "healthInsurance",
      category: "health_insurance",
      ...given("premium_per_year", o.insurance.premiumPerYearUsd, ctx.user),
      frequency: "per_year",
      phase: "ongoing",
      billing: "year_start",
    });
  } else if (o.insurance?.kind === "waiver") {
    g.items.push({
      id: "healthInsurance",
      category: "health_insurance",
      ...given("waived_premium", 0 as Cents, ctx.user),
      frequency: "per_year",
      phase: "ongoing",
      billing: "year_start",
      noteId: "insurance_waived",
    });
  } else {
    g.items.push(
      fromConstant(ESTIMATES.healthInsurancePerYear, {
        id: "healthInsurance",
        category: "health_insurance",
        frequency: "per_year",
        phase: "ongoing",
        billing: "year_start",
      }),
    );
  }
  if (dependants > 0) {
    const k = ESTIMATES.dependantInsurancePerYear;
    const d = derive("product", [
      usdTerm("premium_per_dependant", k.amountUsd, k.source.id),
      countTerm("dependants", dependants),
    ]);
    g.items.push({
      id: "dependantInsurance",
      category: "health_insurance",
      amountUsd: d.amountUsd,
      derivation: d.derivation,
      range: { low: mulCents(k.range.low, dependants), high: mulCents(k.range.high, dependants) },
      frequency: "per_year",
      phase: "ongoing",
      billing: "year_start",
      source: k.source,
    });
  }
  return g;
}
