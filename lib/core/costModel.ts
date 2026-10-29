import type { Constant } from "@/data/constants";
import {
  COLD_STATES,
  ESTIMATES,
  FEES,
  FLIGHT_ONE_WAY_BY_REGION,
  REGION_BY_COUNTRY,
} from "@/data/constants";
import { addCents, clampNonNegative, mulCents } from "./money";
import type { AreaRent, Cents, EstimateInput, LineItem, SchoolCosts, Source } from "./types";

// Builds every line item from the inputs and whatever data is available. Pure. Anything
// missing becomes a labelled estimate; nothing is silently invented.

export interface CostModelData {
  school?: SchoolCosts;
  rent?: AreaRent;
}

export interface CostModelResult {
  items: LineItem[];
  noteIds: string[];
  /** Figures that disagree with another source, for a side-by-side in the UI. */
  comparisons: Array<{ itemId: string; alternativeUsd: Cents; alternativeSource: Source }>;
}

const USER: Source = { kind: "user", name: "Your input", date: "" };

function fromConstant(
  k: Constant,
  over: Omit<LineItem, "amountUsd" | "range" | "source" | "id"> & {
    id?: string;
    amountUsd?: Cents;
  },
): LineItem {
  return {
    id: over.id ?? k.id,
    amountUsd: over.amountUsd ?? k.amountUsd,
    ...(k.range ? { range: k.range } : {}),
    source: k.source,
    ...over,
  };
}

export function buildLineItems(
  input: EstimateInput,
  data: CostModelData,
  today: string,
): CostModelResult {
  const items: LineItem[] = [];
  const noteIds: string[] = [];
  const comparisons: CostModelResult["comparisons"] = [];
  const o = input.options;
  const user = { ...USER, date: today };
  const housing = o.housing ?? { kind: "on_campus" as const, bedrooms: 1 as const, roommates: 0 };
  const dependants = Math.max(0, Math.floor(o.dependants ?? 0));

  // Tuition, net of scholarship. Scholarship above tuition is clamped and noted.
  const scholarship = o.scholarshipPerYearUsd ?? (0 as Cents);
  const netTuition = clampNonNegative(addCents(input.tuitionPerYearUsd, -scholarship as Cents));
  if (scholarship > 0)
    noteIds.push(
      scholarship > input.tuitionPerYearUsd ? "scholarship_exceeds_tuition" : "scholarship_applied",
    );
  items.push({
    id: "tuition",
    category: "tuition",
    amountUsd: netTuition,
    frequency: "per_year",
    phase: "ongoing",
    source: input.tuitionSource,
  });
  if (o.enrolmentDepositUsd && o.enrolmentDepositUsd > 0) {
    items.push({
      id: "enrolmentDeposit",
      category: "tuition",
      amountUsd: o.enrolmentDepositUsd,
      frequency: "one_off",
      phase: "pre_arrival",
      source: user,
      timingOnly: true,
      noteId: "deposit_credited_to_tuition",
    });
  }

  // Books
  if (data.school?.booksSupplyUsd !== undefined) {
    items.push({
      id: "books",
      category: "living",
      amountUsd: data.school.booksSupplyUsd,
      frequency: "per_year",
      phase: "ongoing",
      source: data.school.source,
    });
  } else {
    items.push(
      fromConstant(ESTIMATES.booksPerYear, {
        id: "books",
        category: "living",
        frequency: "per_year",
        phase: "ongoing",
      }),
    );
  }

  // Housing
  if (housing.kind === "on_campus") {
    if (data.school?.roomBoardOnCampusUsd !== undefined) {
      items.push({
        id: "roomAndBoard",
        category: "housing",
        amountUsd: data.school.roomBoardOnCampusUsd,
        frequency: "per_year",
        phase: "ongoing",
        source: data.school.source,
      });
    } else {
      items.push(
        fromConstant(ESTIMATES.roomBoardOnCampusPerYear, {
          id: "roomAndBoard",
          category: "housing",
          frequency: "per_year",
          phase: "ongoing",
        }),
      );
      noteIds.push("no_school_housing_figure");
    }
  } else {
    let rent: Cents;
    let rentSource: Source;
    if (housing.monthlyRentUsd !== undefined) {
      rent = housing.monthlyRentUsd;
      rentSource = user;
    } else if (data.rent) {
      const share = housing.roommates + 1;
      rent = mulCents(data.rent.monthlyByBedrooms[housing.bedrooms], 1 / share);
      rentSource = data.rent.source;
    } else {
      rent = ESTIMATES.rentPerMonthFallback.amountUsd;
      rentSource = ESTIMATES.rentPerMonthFallback.source;
      noteIds.push("no_area_rent");
    }
    items.push({
      id: "rent",
      category: "housing",
      amountUsd: rent,
      frequency: "per_month",
      phase: "ongoing",
      source: rentSource,
      noteId: "fmr_is_40th_percentile",
    });
    if (data.school?.roomBoardOffCampusUsd !== undefined) {
      comparisons.push({
        itemId: "rent",
        alternativeUsd: data.school.roomBoardOffCampusUsd,
        alternativeSource: data.school.source,
      });
    }
    items.push(
      fromConstant(ESTIMATES.foodOffCampusPerMonth, {
        id: "food",
        category: "living",
        frequency: "per_month",
        phase: "ongoing",
      }),
    );
    items.push({
      id: "securityDeposit",
      category: "housing",
      amountUsd: rent,
      frequency: "one_off",
      phase: "arrival",
      source: { kind: "estimate", name: "One month's rent", date: today },
      noteId: "deposit_rules_vary",
    });
    items.push({
      id: "depositDeductions",
      category: "housing",
      amountUsd: 0 as Cents,
      range: { low: 0 as Cents, high: rent },
      frequency: "one_off",
      phase: "departure",
      source: { kind: "estimate", name: "Risk, not a cost", date: today },
      riskOnly: true,
    });
    if (housing.lastMonthUpfront) {
      items.push({
        id: "lastMonthRentUpfront",
        category: "housing",
        amountUsd: rent,
        frequency: "one_off",
        phase: "arrival",
        source: user,
        timingOnly: true,
      });
    }
    if (housing.twelveMonthLease) {
      items.push({
        id: "summerRent",
        category: "housing",
        amountUsd: rent,
        frequency: "per_month",
        phase: "ongoing",
        source: rentSource,
        noteId: "summer_rent",
      });
    }
    if (housing.tempAccommodationNights && housing.tempAccommodationNights > 0) {
      const k = ESTIMATES.tempAccommodationPerNight;
      items.push({
        id: "tempAccommodation",
        category: "one_off",
        amountUsd: mulCents(k.amountUsd, housing.tempAccommodationNights),
        range: {
          low: mulCents(k.range.low, housing.tempAccommodationNights),
          high: mulCents(k.range.high, housing.tempAccommodationNights),
        },
        frequency: "one_off",
        phase: "arrival",
        source: k.source,
      });
    }
  }

  // Personal living costs
  const other =
    housing.kind === "on_campus"
      ? data.school?.otherExpenseOnCampusUsd
      : data.school?.otherExpenseOffCampusUsd;
  if (other !== undefined && data.school) {
    items.push({
      id: "otherExpenses",
      category: "living",
      amountUsd: other,
      frequency: "per_year",
      phase: "ongoing",
      source: data.school.source,
    });
  } else {
    items.push(
      fromConstant(ESTIMATES.otherExpensePerYear, {
        id: "otherExpenses",
        category: "living",
        frequency: "per_year",
        phase: "ongoing",
      }),
    );
  }

  // Health insurance
  if (o.insurance?.premiumPerYearUsd !== undefined) {
    items.push({
      id: "healthInsurance",
      category: "living",
      amountUsd: o.insurance.premiumPerYearUsd,
      frequency: "per_year",
      phase: "ongoing",
      source: user,
    });
  } else if (o.insurance?.kind === "waiver") {
    items.push({
      id: "healthInsurance",
      category: "living",
      amountUsd: 0 as Cents,
      frequency: "per_year",
      phase: "ongoing",
      source: user,
      noteId: "insurance_waived",
    });
  } else {
    items.push(
      fromConstant(ESTIMATES.healthInsurancePerYear, {
        id: "healthInsurance",
        category: "living",
        frequency: "per_year",
        phase: "ongoing",
      }),
    );
  }
  if (dependants > 0) {
    const k = ESTIMATES.dependantInsurancePerYear;
    items.push({
      id: "dependantInsurance",
      category: "living",
      amountUsd: mulCents(k.amountUsd, dependants),
      range: { low: mulCents(k.range.low, dependants), high: mulCents(k.range.high, dependants) },
      frequency: "per_year",
      phase: "ongoing",
      source: k.source,
    });
  }

  // Flights
  const region = REGION_BY_COUNTRY[input.countryCode.toUpperCase()] ?? "southAsia";
  const flightK = FLIGHT_ONE_WAY_BY_REGION[region];
  const oneWay = o.flights?.oneWayUsd ?? flightK.amountUsd;
  const flightSource = o.flights?.oneWayUsd !== undefined ? user : flightK.source;
  const flightRange = o.flights?.oneWayUsd !== undefined ? undefined : flightK.range;
  items.push({
    id: "flightToSchool",
    category: "one_off",
    amountUsd: oneWay,
    ...(flightRange ? { range: flightRange } : {}),
    frequency: "one_off",
    phase: "pre_arrival",
    source: flightSource,
  });
  const trips = Math.max(0, o.flights?.tripsHomePerYear ?? 1);
  if (trips > 0) {
    items.push({
      id: "flightsHome",
      category: "one_off",
      amountUsd: mulCents(oneWay, 2 * trips),
      ...(flightRange
        ? {
            range: {
              low: mulCents(flightRange.low, 2 * trips),
              high: mulCents(flightRange.high, 2 * trips),
            },
          }
        : {}),
      frequency: "per_year",
      phase: "ongoing",
      source: flightSource,
    });
  }
  items.push({
    id: "finalFlight",
    category: "one_off",
    amountUsd: oneWay,
    ...(flightRange ? { range: flightRange } : {}),
    frequency: "one_off",
    phase: "departure",
    source: flightSource,
  });

  // Visa and government fees
  items.push(
    fromConstant(FEES.visaApplicationMrv, {
      id: "visaApplication",
      category: "one_off",
      amountUsd: mulCents(FEES.visaApplicationMrv.amountUsd, 1 + dependants),
      frequency: "one_off",
      phase: "pre_arrival",
    }),
  );
  items.push(
    fromConstant(FEES.sevisI901F1, {
      id: "sevisFee",
      category: "one_off",
      frequency: "one_off",
      phase: "pre_arrival",
    }),
  );
  items.push(
    fromConstant(FEES.visaIntegrityFee, {
      id: "visaIntegrityFee",
      category: "one_off",
      amountUsd: mulCents(FEES.visaIntegrityFee.amountUsd, 1 + dependants),
      frequency: "one_off",
      phase: "pre_arrival",
      noteId: "may_apply",
    }),
  );
  items.push(
    fromConstant(ESTIMATES.preDeparture, {
      id: "preDeparture",
      category: "one_off",
      frequency: "one_off",
      phase: "pre_arrival",
    }),
  );

  // Settling in
  const furnished = housing.kind === "on_campus" || housing.furnished === true;
  items.push(
    fromConstant(furnished ? ESTIMATES.homeSetupFurnished : ESTIMATES.homeSetupUnfurnished, {
      id: "homeSetup",
      category: "one_off",
      frequency: "one_off",
      phase: "arrival",
    }),
  );
  items.push(
    fromConstant(ESTIMATES.phoneSetup, {
      id: "phoneSetup",
      category: "one_off",
      frequency: "one_off",
      phase: "arrival",
    }),
  );
  items.push(
    fromConstant(ESTIMATES.transportCard, {
      id: "transportCard",
      category: "one_off",
      frequency: "one_off",
      phase: "arrival",
    }),
  );
  if (COLD_STATES.has(input.school.state.toUpperCase())) {
    items.push(
      fromConstant(ESTIMATES.winterClothing, {
        id: "winterClothing",
        category: "one_off",
        frequency: "one_off",
        phase: "arrival",
      }),
    );
  }

  // Leaving
  items.push(
    fromConstant(ESTIMATES.shippingHome, {
      id: "shippingHome",
      category: "one_off",
      frequency: "one_off",
      phase: "departure",
    }),
  );

  return { items, noteIds, comparisons };
}
