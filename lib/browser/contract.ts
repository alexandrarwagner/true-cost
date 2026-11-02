import type { AreaRent, RatePoint, SchoolCosts } from "@/lib/core/types";

/*
 * The page's contract with the engine (design/wired/engine-adapter.js). The shapes the page
 * already reads are kept exactly; `lines` and `meta`'s extra fields are additive. Money here
 * is in whole currency units (dollars, or home units for `fx`), not cents, because that is
 * what the page's formatter expects.
 */

export interface PageSchool {
  unitId: number;
  name: string;
  city: string;
  state: string;
  zip: string;
}

export interface PageInput {
  tuitionPerYearUsd: number;
  /** 1 to 6. */
  years: number;
  /** The country name typed or picked. */
  from: string;
  /** ISO code from the currency chip, e.g. "INR". */
  currency: string;
  /** The name typed, or the school picked from the search (with its UNITID). */
  school: string | PageSchool;
  /** "school" when the search filled the tuition in; otherwise the student typed it. */
  tuitionSource?: "user" | "school";
  /** The student's own numbers; only `house` (monthly rent, USD) is honoured for now. */
  overrides?: {
    house?: number | null;
    live?: number | null;
    one?: number | null;
    move?: number | null;
  };
  /** "Know a cost we missed?": USD, once or every month. */
  extras?: { name: string; amt: number; freq: "once" | "month" }[];
}

/** The fan chart's input: cumulative spend by month, in home units. */
export interface PageFx {
  today: number[];
  p10: number[];
  p90: number[];
  worst: number[];
  n: number;
  H: number;
  buf: number;
  lo: number;
  hi: number;
  usdTotal: number;
}

export interface PageLine {
  id: string;
  name: string;
  category: string;
  /** Per occurrence, USD. */
  amountUsd: number;
  /** Over the whole degree, USD. */
  degreeUsd: number;
  frequency: string;
  phase: string;
  billing: string;
  confidence: "user" | "school" | "government" | "estimate";
  source: { id: string; name: string; url?: string };
  checkedOn: string;
  derivation: { formula: string; terms: { label: string; value: number; unit: string }[] };
}

export interface PageEstimate {
  c: { tui: number; house: number; live: number; one: number; move: number };
  tot: number;
  exM: number;
  exO: number;
  o: {
    T: number;
    Y: number;
    rentM: number;
    liveM: number;
    one: number;
    extraOnce: number;
    extraMonthly: number;
    move: number | undefined;
    rate: number;
  };
  fx: PageFx | null;
  meta: {
    sampleNote: string;
    demo: boolean;
    /** Sources that were missing when this ran; their lines are labelled estimates. */
    degraded: string[];
    currency: string;
    today: string;
    /** Query for /estimate/breakdown (the shared page's codec); null when the school has no id. */
    shareQuery: string | null;
  };
  lines: PageLine[];
}

export interface Context {
  school: SchoolCosts | null;
  rent: AreaRent | null;
  demo: boolean;
}

export interface FxData {
  today: (RatePoint & { source: string }) | null;
  history: RatePoint[];
}

/** How the engine gets data: the browser fetches the API routes; tests pass fixtures. */
export interface EngineDeps {
  loadContext(school: PageSchool): Promise<Context>;
  loadFx(currency: string): Promise<FxData>;
  now?: () => Date;
}

export interface TPEngine {
  version: string;
  /** Home units per USD for every currency known so far; refreshed by ready(). */
  rates(): Record<string, number>;
  /** Loads the school's figures and the currency's rates; resolve before estimate(). */
  ready(input: PageInput): Promise<void>;
  /** Synchronous, from whatever ready() has loaded; missing sources become estimates. */
  estimate(input: PageInput): PageEstimate;
  /**
   * An amount in whole units of a currency, as the app prints it: "full" with the locale's
   * grouping, "big" the culture's short form where one exists (lakh, crore), "short" compact
   * for tight spaces (₩134M). The page keeps its own rupee formatting; this covers the rest.
   */
  format(units: number, currency: string, mode: "full" | "big" | "cr" | "short"): string;
  /** The currency's symbol in its own locale, e.g. "₩", or the code when there is none. */
  symbol(currency: string): string;
  /** The currency's everyday name for a sentence ("rupee", "won"), or the code. */
  currencyName(currency: string): string;
  /** A country's name from its code ("IN" → "India"), or "" when unknown. */
  countryName(code: string): string;
  /** The currency codes the engine can calculate in, USD included. */
  currencies(): string[];
}
