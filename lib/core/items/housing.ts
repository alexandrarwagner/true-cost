import { ESTIMATES } from "@/data/constants";
import { mulCents } from "../money";
import type { Cents, Source } from "../types";
import { empty, fromConstant, type ItemContext, type ItemGroup } from "./common";

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
        amountUsd: ctx.school.roomBoardOnCampusUsd,
        frequency: "per_year",
        phase: "ongoing",
        billing: "year_start",
        source: ctx.school.source,
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
  let rentSource: Source;
  if (housing.monthlyRentUsd !== undefined) {
    rent = housing.monthlyRentUsd;
    rentSource = ctx.user;
  } else if (ctx.rent) {
    rent = mulCents(ctx.rent.monthlyByBedrooms[housing.bedrooms], 1 / (housing.roommates + 1));
    rentSource = ctx.rent.source;
  } else {
    rent = ESTIMATES.rentPerMonthFallback.amountUsd;
    rentSource = ESTIMATES.rentPerMonthFallback.source;
    g.noteIds.push("no_area_rent");
  }

  g.items.push({
    id: "rent",
    category: "housing",
    amountUsd: rent,
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
  g.items.push({
    id: "securityDeposit",
    category: "housing",
    amountUsd: rent,
    frequency: "one_off",
    phase: "arrival",
    billing: "arrival",
    source: { kind: "estimate", name: "One month's rent", date: ctx.today },
    noteId: "deposit_rules_vary",
  });
  g.items.push({
    id: "depositDeductions",
    category: "housing",
    amountUsd: 0 as Cents,
    range: { low: 0 as Cents, high: rent },
    frequency: "one_off",
    phase: "departure",
    billing: "departure",
    source: { kind: "estimate", name: "Risk, not a cost", date: ctx.today },
    riskOnly: true,
  });
  if (housing.lastMonthUpfront) {
    g.items.push({
      id: "lastMonthRentUpfront",
      category: "housing",
      amountUsd: rent,
      frequency: "one_off",
      phase: "arrival",
      billing: "arrival",
      creditAgainst: { itemId: "rent", occurrence: "last" },
      source: ctx.user,
      timingOnly: true,
    });
  }
  if (housing.twelveMonthLease) {
    if (years > 1)
      g.items.push({
        id: "summerRent",
        category: "housing",
        amountUsd: rent,
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
      amountUsd: rent,
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
    g.items.push({
      id: "tempAccommodation",
      category: "one_off",
      amountUsd: mulCents(k.amountUsd, n),
      range: { low: mulCents(k.range.low, n), high: mulCents(k.range.high, n) },
      frequency: "one_off",
      phase: "arrival",
      billing: "arrival",
      source: k.source,
    });
  }
  return g;
}
