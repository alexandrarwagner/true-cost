// Core domain types. Pure: no I/O, no framework.

/** US dollars in integer cents. */
export type Cents = number & { readonly __brand: "Cents" };
/** Home currency in integer minor units (paise, jeon, kobo...). KRW and VND have 0 decimals. */
export type Minor = number & { readonly __brand: "Minor" };
/** ISO date, YYYY-MM-DD. */
export type IsoDate = string;

export type Frequency = "one_off" | "per_year" | "per_semester" | "per_month";
/** When an item is billed. The schedule is driven by this, not by item ids. */
export type Billing =
  | "pre_arrival"
  | "arrival"
  | "departure"
  | "semester"
  | "year_start"
  | "winter_break"
  | "monthly"
  | "summer";
/** Restrict a recurring item to some academic years. */
export type YearScope = "all" | "non_final" | "final";
export type Phase = "pre_arrival" | "arrival" | "ongoing" | "departure";
export type Confidence = "user" | "school" | "government" | "estimate";
export type Category =
  "tuition" | "housing" | "health_insurance" | "living" | "one_off" | "money_moving";

/** Where a figure comes from, as registered in data/sources.ts. */
export type SourceId = "user" | "scorecard" | "hud" | "frankfurter" | "constants" | "rule" | "deal";

export interface Source {
  id: SourceId;
  kind: Confidence;
  /** Short name, e.g. "College Scorecard", "HUD FMR FY2027", "Your input". */
  name: string;
  url?: string;
  /** When the figure was published or checked. */
  date: IsoDate;
}

// A derivation is how an amount was computed, built by the same code that computed it, so the
// breakdown page can print the formula with the user's own numbers and never disagree with
// the total (ADR 015).
export type FormulaId =
  | "given" // one money term, as a source or the user states it
  | "product" // money × count × count…
  | "quotient" // money ÷ people
  | "difference" // money − money, floored at zero
  | "deducted"; // money − a deal's saving per occurrence, floored at zero
export type TermUnit = "usd" | "count" | "people" | "months" | "nights" | "home" | "rate";
export interface Term {
  /** Copy key for the breakdown page, e.g. "hud_rent", "people_sharing". */
  label: string;
  value: number;
  unit: TermUnit;
  sourceId?: SourceId;
}
export interface Derivation {
  formula: FormulaId;
  terms: Term[];
  /** Per occurrence; equals the item's amountUsd by construction. */
  result: Cents;
}

export interface LineItem {
  id: string;
  category: Category;
  amountUsd: Cents;
  derivation: Derivation;
  /** Shown when the figure is an estimate: the band we are reasonably sure of. */
  range?: { low: Cents; high: Cents };
  frequency: Frequency;
  phase: Phase;
  billing: Billing;
  /** Which academic years a recurring item applies to; defaults to all. */
  yearScope?: YearScope;
  /** Paid now but credited against another item's first or last bill (deposits). */
  creditAgainst?: { itemId: string; occurrence: "first" | "last" };
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

/** How often living costs are sent: every month, or batched at each semester start. */
export type TransferCadence = "monthly" | "semester";

/** A cost the user adds themselves ("Know a cost we missed?"). Converted to USD on entry. */
export interface CustomCost {
  /** 1–40 characters of plain text, rendered as text only. */
  label: string;
  amountUsd: Cents;
  frequency: "one_off" | "monthly";
  /** Present when the amount was entered in the home currency. */
  converted?: { amountHome: number; currency: string; rate: number; date: IsoDate };
}

export interface EstimateOptions {
  housing?: HousingOptions;
  /** Up to ten user-added costs. */
  customCosts?: CustomCost[];
  scholarshipPerYearUsd?: Cents;
  insurance?: {
    kind: "school_plan" | "waiver";
    premiumPerYearUsd?: Cents;
    /** What the user's own cover costs, so the waiver lever can price the switch. */
    ownPremiumPerYearUsd?: Cents;
  };
  flights?: { tripsHomePerYear: number; oneWayUsd?: Cents };
  transfer?: TransferOptions;
  transferCadence?: TransferCadence;
  /** Paying from a US dollar account: no exchange-rate risk and no transfer markup. */
  payFromUsd?: boolean;
  dependants?: number;
  enrolmentDepositUsd?: Cents;
  /** Amounts taken off a line over the degree (student deals switched on). Capped at the line. */
  deductions?: Deduction[];
}

export interface Deduction {
  /** The deal's id, so applying the same deal twice replaces rather than doubles. */
  id: string;
  lineId: string;
  amountUsd: Cents;
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

/** Hand-checked facts about a school that no API provides (data/school-flags.json). */
export interface SchoolFlag {
  waiverAllowed: boolean;
  sourceUrl: string;
  checkedOn: IsoDate;
}
export type SchoolFlags = Record<string, SchoolFlag>;

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
  healthInsurance: Cents;
  living: Cents;
  oneOff: Cents;
  moneyMoving: Cents;
  total: Cents;
  /** (total - tuition) / tuition, as a percentage rounded to the nearest whole number. */
  hiddenPercentOfTuition: number;
}

/** How the money-moving total was built, for the breakdown page. */
export interface MoneyMoving {
  transfers: number;
  markupBps: number;
  fixedFeeUsd: Cents;
  markupUsd: Cents;
  feesUsd: Cents;
  totalUsd: Cents;
}

export interface Estimate {
  input: EstimateInput;
  items: LineItem[];
  totals: Totals;
  moneyMoving: MoneyMoving;
  schedule: PaymentEvent[];
  fx: FxReplay | FxUnsupported;
  /** Unique sources behind the figures, for the "where each number comes from" list. */
  sources: Source[];
  /** Machine notes the UI maps to copy, e.g. "scholarship_exceeds_tuition". */
  noteIds: string[];
}
