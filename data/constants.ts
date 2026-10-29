// Hand-curated figures. Every entry has a source, a URL and the date it was checked.
// CI fails when any entry is older than MAX_AGE_DAYS (scripts/check-constants-age.ts).
// Estimates are bands, not single numbers, and are labelled "estimate" in the UI.
// REVIEW STATUS: drafted 2026-10-29; each estimate awaits the owner's sign-off.

import type { Cents, Confidence, IsoDate, Source } from "@/lib/core/types";

export const MAX_AGE_DAYS = 180;

export interface Constant {
  id: string;
  amountUsd: Cents;
  range?: { low: Cents; high: Cents };
  confidence: Confidence;
  source: Source;
  checkedOn: IsoDate;
  /** Shown as "may apply" rather than counted as certain. */
  mayApply?: boolean;
  note?: string;
}

const c = (n: number): Cents => Math.round(n * 100) as Cents;
const CHECKED: IsoDate = "2026-10-29";

const BU_ISSO: Source = {
  kind: "government",
  name: "Boston University ISSO, citing US Dept. of State and ICE",
  url: "https://www.bu.edu/isso/2026/05/19/visa-integrity-fee/",
  date: "2026-05-19",
};
const ICE_I901: Source = {
  kind: "government",
  name: "ICE SEVIS I-901 fee page",
  url: "https://www.ice.gov/sevis/i901",
  date: "2024-12-10",
};
const ESTIMATE: Source = {
  kind: "estimate",
  name: "True Cost estimate, pending review",
  date: CHECKED,
};

export const FEES = {
  visaApplicationMrv: {
    id: "visaApplicationMrv",
    amountUsd: c(185),
    confidence: "government",
    source: BU_ISSO,
    checkedOn: CHECKED,
    note: "Nonimmigrant visa application fee (MRV) for F, M and J visas. Per applicant, including each F-2 dependant.",
  },
  sevisI901F1: {
    id: "sevisI901F1",
    amountUsd: c(350),
    confidence: "government",
    source: ICE_I901,
    checkedOn: CHECKED,
    note: "SEVIS I-901 fee for F-1 students. Dependants on F-2 do not pay it separately.",
  },
  visaIntegrityFee: {
    id: "visaIntegrityFee",
    amountUsd: c(250),
    confidence: "government",
    source: BU_ISSO,
    checkedOn: CHECKED,
    mayApply: true,
    note: "Created by P.L. 119-21 (July 2025), collected at visa issuance. Rolling out post by post; described as theoretically refundable with procedures still being finalised.",
  },
} as const satisfies Record<string, Constant>;

/** One-way economy fare to a US campus, by region of origin. Wide bands on purpose. */
export const FLIGHT_ONE_WAY_BY_REGION = {
  southAsia: {
    id: "flightSouthAsia",
    amountUsd: c(1000),
    range: { low: c(700), high: c(1400) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
  },
  eastAsia: {
    id: "flightEastAsia",
    amountUsd: c(900),
    range: { low: c(600), high: c(1300) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
  },
  southeastAsia: {
    id: "flightSoutheastAsia",
    amountUsd: c(1100),
    range: { low: c(800), high: c(1500) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
  },
  northAmerica: {
    id: "flightNorthAmerica",
    amountUsd: c(300),
    range: { low: c(150), high: c(450) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
  },
  africa: {
    id: "flightAfrica",
    amountUsd: c(1300),
    range: { low: c(900), high: c(1800) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
  },
  southAmerica: {
    id: "flightSouthAmerica",
    amountUsd: c(900),
    range: { low: c(600), high: c(1300) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
  },
} as const satisfies Record<string, Constant>;

export type Region = keyof typeof FLIGHT_ONE_WAY_BY_REGION;
export const REGION_BY_COUNTRY: Record<string, Region> = {
  IN: "southAsia",
  NP: "southAsia",
  BD: "southAsia",
  CN: "eastAsia",
  KR: "eastAsia",
  TW: "eastAsia",
  VN: "southeastAsia",
  CA: "northAmerica",
  NG: "africa",
  BR: "southAmerica",
};

export const ESTIMATES = {
  preDeparture: {
    id: "preDeparture",
    amountUsd: c(300),
    range: { low: c(150), high: c(500) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Medical exam, vaccinations the school requires, document fees.",
  },
  homeSetupUnfurnished: {
    id: "homeSetupUnfurnished",
    amountUsd: c(1200),
    range: { low: c(800), high: c(2000) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Bedding, kitchen, basic furniture.",
  },
  homeSetupFurnished: {
    id: "homeSetupFurnished",
    amountUsd: c(450),
    range: { low: c(300), high: c(700) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Bedding and kitchen basics when the room is furnished or on campus.",
  },
  phoneSetup: {
    id: "phoneSetup",
    amountUsd: c(60),
    range: { low: c(30), high: c(100) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "SIM and first month. Later months sit inside the school's living-cost figure.",
  },
  transportCard: {
    id: "transportCard",
    amountUsd: c(50),
    range: { low: c(20), high: c(100) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
  },
  winterClothing: {
    id: "winterClothing",
    amountUsd: c(300),
    range: { low: c(200), high: c(500) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Only added when the school's state has cold winters.",
  },
  tempAccommodationPerNight: {
    id: "tempAccommodationPerNight",
    amountUsd: c(80),
    range: { low: c(50), high: c(150) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
  },
  healthInsurancePerYear: {
    id: "healthInsurancePerYear",
    amountUsd: c(2800),
    range: { low: c(2000), high: c(4000) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Typical university-sponsored plan. Enter the school's premium for an exact figure.",
  },
  foodOffCampusPerMonth: {
    id: "foodOffCampusPerMonth",
    amountUsd: c(400),
    range: { low: c(300), high: c(550) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Groceries when living off campus; HUD rent covers housing only.",
  },
  booksPerYear: {
    id: "booksPerYear",
    amountUsd: c(1200),
    range: { low: c(800), high: c(1600) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Fallback when the school reports no books figure.",
  },
  roomBoardOnCampusPerYear: {
    id: "roomBoardOnCampusPerYear",
    amountUsd: c(14000),
    range: { low: c(11000), high: c(18000) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Fallback when the school reports no on-campus figure.",
  },
  otherExpensePerYear: {
    id: "otherExpensePerYear",
    amountUsd: c(2500),
    range: { low: c(1500), high: c(4000) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Fallback when the school reports no personal-expenses figure.",
  },
  rentPerMonthFallback: {
    id: "rentPerMonthFallback",
    amountUsd: c(1300),
    range: { low: c(900), high: c(2000) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Fallback when no HUD rent is available for the area; one bedroom.",
  },
  shippingHome: {
    id: "shippingHome",
    amountUsd: c(350),
    range: { low: c(200), high: c(600) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Extra baggage or a small shipment.",
  },
  dependantInsurancePerYear: {
    id: "dependantInsurancePerYear",
    amountUsd: c(2500),
    range: { low: c(1500), high: c(4000) },
    confidence: "estimate",
    source: ESTIMATE,
    checkedOn: CHECKED,
    note: "Per dependant on F-2.",
  },
} as const satisfies Record<string, Constant>;

/** Illustrative transfer costs, clearly labelled as an assumption until the user enters their own. */
export const TRANSFER_DEFAULT = {
  markupBps: 150,
  fixedFeeUsd: c(15),
  source: {
    kind: "estimate",
    name: "Illustrative assumption; enter your provider's markup and fee",
    date: CHECKED,
  } satisfies Source,
};

/** States where a winter wardrobe is a real cost. */
export const COLD_STATES = new Set([
  "AK",
  "CO",
  "CT",
  "IA",
  "ID",
  "IL",
  "IN",
  "MA",
  "ME",
  "MI",
  "MN",
  "MT",
  "ND",
  "NE",
  "NH",
  "NJ",
  "NY",
  "OH",
  "PA",
  "RI",
  "SD",
  "UT",
  "VT",
  "WI",
  "WY",
  "WA",
  "OR",
  "DC",
  "MD",
  "DE",
  "KS",
  "MO",
  "KY",
  "WV",
]);

export const ALL_CONSTANTS: Constant[] = [
  ...Object.values(FEES),
  ...Object.values(FLIGHT_ONE_WAY_BY_REGION),
  ...Object.values(ESTIMATES),
];
