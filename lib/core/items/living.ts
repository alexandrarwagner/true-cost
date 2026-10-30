import { ESTIMATES } from "@/data/constants";
import { mulCents } from "../money";
import type { Cents } from "../types";
import { empty, fromConstant, type ItemContext, type ItemGroup } from "./common";

/** Books, personal expenses and health insurance, school figures first. */
export function livingItems(ctx: ItemContext): ItemGroup {
  const g = empty();
  const o = ctx.input.options;
  const onCampus = (o.housing?.kind ?? "on_campus") === "on_campus";
  const dependants = Math.max(0, Math.floor(o.dependants ?? 0));

  if (ctx.school?.booksSupplyUsd !== undefined) {
    g.items.push({
      id: "books",
      category: "living",
      amountUsd: ctx.school.booksSupplyUsd,
      frequency: "per_year",
      phase: "ongoing",
      billing: "semester",
      source: ctx.school.source,
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
      amountUsd: other,
      frequency: "per_year",
      phase: "ongoing",
      billing: "year_start",
      source: ctx.school.source,
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
      category: "living",
      amountUsd: o.insurance.premiumPerYearUsd,
      frequency: "per_year",
      phase: "ongoing",
      billing: "year_start",
      source: ctx.user,
    });
  } else if (o.insurance?.kind === "waiver") {
    g.items.push({
      id: "healthInsurance",
      category: "living",
      amountUsd: 0 as Cents,
      frequency: "per_year",
      phase: "ongoing",
      billing: "year_start",
      source: ctx.user,
      noteId: "insurance_waived",
    });
  } else {
    g.items.push(
      fromConstant(ESTIMATES.healthInsurancePerYear, {
        id: "healthInsurance",
        category: "living",
        frequency: "per_year",
        phase: "ongoing",
        billing: "year_start",
      }),
    );
  }
  if (dependants > 0) {
    const k = ESTIMATES.dependantInsurancePerYear;
    g.items.push({
      id: "dependantInsurance",
      category: "living",
      amountUsd: mulCents(k.amountUsd, dependants),
      range: { low: mulCents(k.range.low, dependants), high: mulCents(k.range.high, dependants) },
      frequency: "per_year",
      phase: "ongoing",
      billing: "year_start",
      source: k.source,
    });
  }
  return g;
}
