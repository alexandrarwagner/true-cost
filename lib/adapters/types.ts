import type { AreaRent, Cents, RatePoint, SchoolCosts } from "@/lib/core/types";

// One interface per data source. Real adapters (step 5) and fixture-backed mocks both
// implement these; services never know which they got.

export interface SchoolSummary {
  unitId: number;
  name: string;
  city: string;
  state: string;
  zip: string;
  tuitionOutOfStateUsd?: Cents;
  /** College Scorecard code: 1 certificate, 2 associate, 3 bachelor's, 4 graduate. */
  predominantDegree?: number;
}

export interface SchoolSource {
  search(query: string, signal: AbortSignal): Promise<SchoolSummary[]>;
  costs(
    unitId: number,
    signal: AbortSignal,
  ): Promise<{ summary: SchoolSummary; costs: SchoolCosts } | null>;
}

export interface RentSource {
  forArea(zip: string, state: string, signal: AbortSignal): Promise<AreaRent | null>;
}

export interface FxSource {
  latest(currency: string, signal: AbortSignal): Promise<(RatePoint & { source: string }) | null>;
  history(currency: string, signal: AbortSignal): Promise<RatePoint[]>;
}

export interface DataSources {
  schools: SchoolSource;
  rent: RentSource;
  fx: FxSource;
  /** True when every source is a fixture. */
  demo: boolean;
}
