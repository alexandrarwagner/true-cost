// Core domain types. Pure: no I/O, no framework.

/** US dollars in integer cents. */
export type Cents = number & { readonly __brand: "Cents" };
/** Home currency in integer minor units (paise, jeon, kobo...). KRW and VND have 0 decimals. */
export type Minor = number & { readonly __brand: "Minor" };
/** ISO date, YYYY-MM-DD. */
export type IsoDate = string;

export type Frequency = "one_off" | "per_year" | "per_semester" | "per_month";
export type Phase = "pre_arrival" | "arrival" | "ongoing" | "departure";
export type Confidence = "user" | "school" | "government" | "estimate";
export type Category = "tuition" | "housing" | "living" | "one_off" | "money_moving";

export interface Source {
  kind: Confidence;
  /** Short name, e.g. "College Scorecard", "HUD FMR FY2027", "Your input". */
  name: string;
  url?: string;
  /** When the figure was published or checked. */
  date: IsoDate;
}

export interface LineItem {
  id: string;
  category: Category;
  amountUsd: Cents;
  /** Shown when the figure is an estimate: the band we are reasonably sure of. */
  range?: { low: Cents; high: Cents };
  frequency: Frequency;
  phase: Phase;
  source: Source;
  /** Marks a risk shown but not added, e.g. deposit deductions. */
  riskOnly?: boolean;
  /** Cash needed at that time but already counted elsewhere (deposits credited to tuition or rent). */
  timingOnly?: boolean;
  /** A short machine note the UI can map to copy (e.g. "deposit_rules_vary"). */
  noteId?: string;
}

export type Season = "fall" | "spring";
export type DegreeYears = 1 | 2 | 3 | 4;
export type HousingKind = "on_campus" | "off_campus";

export interface HousingOptions {
  kind: HousingKind;
  bedrooms: 0 | 1 | 2 | 3 | 4;
  roommates: number;
  /** User's actual monthly rent, if known. Overrides HUD. */
  monthlyRentUsd?: Cents;
  furnished?: boolean;
  lastMonthUpfront?: boolean;
  twelveMonthLease?: boolean;
  tempAccommodationNights?: number;
}

export interface TransferOptions {
  /** Markup in basis points over the mid-market rate, e.g. 150 = 1.5%. */
  markupBps: number;
  fixedFeeUsd: Cents;
}

export interface EstimateOptions {
  housing?: HousingOptions;
  scholarshipPerYearUsd?: Cents;
  insurance?: { kind: "school_plan" | "waiver"; premiumPerYearUsd?: Cents };
  flights?: { tripsHomePerYear: number; oneWayUsd?: Cents };
  transfer?: TransferOptions;
  /** Paying from a US dollar account: no exchange-rate risk and no transfer markup. */
  payFromUsd?: boolean;
  dependants?: number;
  enrolmentDepositUsd?: Cents;
}

export interface SchoolRef {
  unitId: number;
  name: string;
  city: string;
  state: string;
  zip: string;
}

export interface EstimateInput {
  countryCode: string;
  homeCurrency: string;
  school: SchoolRef;
  tuitionPerYearUsd: Cents;
  tuitionSource: Source;
  degreeYears: DegreeYears;
  startTerm: { year: number; season: Season };
  options: EstimateOptions;
}

/** What the data layer knows about the school. Any field may be missing. */
export interface SchoolCosts {
  roomBoardOnCampusUsd?: Cents;
  roomBoardOffCampusUsd?: Cents;
  otherExpenseOnCampusUsd?: Cents;
  otherExpenseOffCampusUsd?: Cents;
  booksSupplyUsd?: Cents;
  source: Source;
}

/** HUD Fair Market Rent for the school's area, monthly, by bedroom count. */
export interface AreaRent {
  monthlyByBedrooms: Record<0 | 1 | 2 | 3 | 4, Cents>;
  areaName: string;
  smallArea: boolean;
  source: Source;
}

export interface PaymentEvent {
  date: IsoDate;
  phase: Phase;
  amountUsd: Cents;
  itemIds: string[];
  /** Transfer fee charged on this event when paying from home currency. */
  transferFeeUsd: Cents;
}

export interface RatePoint {
  date: IsoDate;
  /** Home-currency units per 1 USD. */
  rate: number;
}

export interface FxWindow {
  start: IsoDate;
  end: IsoDate;
  totalHome: Minor;
}

export interface FxReplay {
  kind: "replay";
  today: RatePoint & { source: string };
  baselineHome: Minor;
  windows: FxWindow[];
  medianHome: Minor;
  best10Home: Minor;
  worst10Home: Minor;
  worst: FxWindow;
  best: FxWindow;
  /** Cumulative spend after each payment, across windows, for the band chart. */
  path: FxPathPoint[];
  historyFrom: IsoDate;
  historyTo: IsoDate;
}

export interface FxPathPoint {
  date: IsoDate;
  baseline: Minor;
  best10: Minor;
  median: Minor;
  worst10: Minor;
}

export interface FxUnsupported {
  kind: "unsupported";
  reasonId: "no_history" | "history_too_short" | "pay_from_usd";
  today?: RatePoint & { source: string };
  baselineHome?: Minor;
}

export interface Totals {
  tuition: Cents;
  housing: Cents;
  living: Cents;
  oneOff: Cents;
  moneyMoving: Cents;
  total: Cents;
  /** (total - tuition) / tuition, as a percentage rounded to the nearest whole number. */
  hiddenPercentOfTuition: number;
}

export interface Estimate {
  input: EstimateInput;
  items: LineItem[];
  totals: Totals;
  schedule: PaymentEvent[];
  fx: FxReplay | FxUnsupported;
  /** Unique sources behind the figures, for the "where each number comes from" list. */
  sources: Source[];
  /** Machine notes the UI maps to copy, e.g. "scholarship_exceeds_tuition". */
  noteIds: string[];
}
