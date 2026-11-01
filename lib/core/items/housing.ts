import { ESTIMATES } from "@/data/constants";
import { derive, usdTerm } from "../derive";
import { mulCents } from "../money";
import type { Cents, Derivation, Source } from "../types";
import { empty, fromConstant, given, type ItemContext, type ItemGroup } from "./common";

/** On-campus room and meals, or off-campus rent with everything that comes with a lease. */
export function housingItems(ctx: ItemContext): ItemGroup {
  const g = empty();
  const housing = ctx.input.options.housing ?? {
    kind: "on_campus" as const,
    bedrooms: 1 as const,
    roommates: 0,
  };
  const years = ctx.input.degreeYears;

  if (housing.kind === "on_campus") {
    if (ctx.school?.roomBoardOnCampusUsd !== undefined) {
      g.items.push({
        id: "roomAndBoard",
        category: "housing",
        ...given(
          "school_room_and_board_figure",
          ctx.school.roomBoardOnCampusUsd,
          ctx.school.source,
        ),
        frequency: "per_year",
        phase: "ongoing",
        billing: "year_start",
      });
    } else {
      g.items.push(
        fromConstant(ESTIMATES.roomBoardOnCampusPerYear, {
          id: "roomAndBoard",
          category: "housing",
          frequency: "per_year",
          phase: "ongoing",
          billing: "year_start",
        }),
      );
      g.noteIds.push("no_school_housing_figure");
    }
    return g;
  }

  let rent: Cents;
  let rentDerivation: Derivation;
  let rentSource: Source;
  if (housing.monthlyRentUsd !== undefined) {
    const d = derive("given", [usdTerm("your_monthly_rent", housing.monthlyRentUsd, "user")]);
    rent = d.amountUsd;
    rentDerivation = d.derivation;
    rentSource = ctx.user;
  } else if (ctx.rent) {
    const d = derive("quotient", [
      usdTerm(
        "area_rent_for_bedrooms",
        ctx.rent.monthlyByBedrooms[housing.bedrooms],
        ctx.rent.source.id,
      ),
      { label: "people_sharing", value: housing.roommates + 1, unit: "people" },
    ]);
    rent = d.amountUsd;
    rentDerivation = d.derivation;
    rentSource = ctx.rent.source;
  } else {
    const k = ESTIMATES.rentPerMonthFallback;
    const d = derive("given", [usdTerm(k.id, k.amountUsd, k.source.id)]);
    rent = d.amountUsd;
    rentDerivation = d.derivation;
    rentSource = k.source;
    g.noteIds.push("no_area_rent");
  }
  /** Items that equal one month's rent by rule. */
  const ruleSource = (name: string): Source => ({
    id: "rule",
    kind: "estimate",
    name,
    date: ctx.today,
  });
  const oneMonthsRent = (label: string) => derive("given", [usdTerm(label, rent, "rule")]);

  g.items.push({
    id: "rent",
    category: "housing",
    amountUsd: rent,
    derivation: rentDerivation,
    frequency: "per_month",
    phase: "ongoing",
    billing: "monthly",
    source: rentSource,
    noteId: "fmr_is_40th_percentile",
  });
  if (ctx.school?.roomBoardOffCampusUsd !== undefined) {
    g.comparisons.push({
      itemId: "rent",
      alternativeUsd: ctx.school.roomBoardOffCampusUsd,
      alternativeSource: ctx.school.source,
    });
  }
  g.items.push(
    fromConstant(ESTIMATES.foodOffCampusPerMonth, {
      id: "food",
      category: "living",
      frequency: "per_month",
      phase: "ongoing",
      billing: "monthly",
    }),
  );
  const deposit = oneMonthsRent("one_months_rent");
  g.items.push({
    id: "securityDeposit",
    category: "housing",
    amountUsd: deposit.amountUsd,
    derivation: deposit.derivation,
    frequency: "one_off",
    phase: "arrival",
    billing: "arrival",
    source: ruleSource("One month's rent"),
    noteId: "deposit_rules_vary",
  });
  const risk = derive("given", [usdTerm("deposit_deductions_risk", 0 as Cents, "rule")]);
  g.items.push({
    id: "depositDeductions",
    category: "housing",
    amountUsd: risk.amountUsd,
    derivation: risk.derivation,
    range: { low: 0 as Cents, high: rent },
    frequency: "one_off",
    phase: "departure",
    billing: "departure",
    source: ruleSource("Risk, not a cost"),
    riskOnly: true,
  });
  if (housing.lastMonthUpfront) {
    const d = oneMonthsRent("last_months_rent");
    g.items.push({
      id: "lastMonthRentUpfront",
      category: "housing",
      amountUsd: d.amountUsd,
      derivation: d.derivation,
      frequency: "one_off",
      phase: "arrival",
      billing: "arrival",
      creditAgainst: { itemId: "rent", occurrence: "last" },
      source: ctx.user,
      timingOnly: true,
    });
  }
  if (housing.twelveMonthLease) {
    const d = oneMonthsRent("monthly_rent");
    if (years > 1)
      g.items.push({
        id: "summerRent",
        category: "housing",
        amountUsd: d.amountUsd,
        derivation: d.derivation,
        frequency: "per_month",
        phase: "ongoing",
        billing: "summer",
        yearScope: "non_final",
        source: rentSource,
        noteId: "summer_rent",
      });
    g.items.push({
      id: "overlapRent",
      category: "housing",
      amountUsd: d.amountUsd,
      derivation: d.derivation,
      frequency: "per_month",
      phase: "departure",
      billing: "summer",
      yearScope: "final",
      source: rentSource,
      noteId: "summer_rent",
    });
  }
  if (housing.tempAccommodationNights && housing.tempAccommodationNights > 0) {
    const k = ESTIMATES.tempAccommodationPerNight;
    const n = housing.tempAccommodationNights;
    const d = derive("product", [
      usdTerm("per_night", k.amountUsd, k.source.id),
      { label: "nights", value: n, unit: "nights" },
    ]);
    g.items.push({
      id: "tempAccommodation",
      category: "one_off",
      amountUsd: d.amountUsd,
      derivation: d.derivation,
      range: { low: mulCents(k.range.low, n), high: mulCents(k.range.high, n) },
      frequency: "one_off",
      phase: "arrival",
      billing: "arrival",
      source: k.source,
    });
  }
  return g;
}
