import type { IsoDate } from "../types";

// A student deal is a lever of its own kind: a human-approved fact from a source page, never
// something the engine or an AI worked out. A figure exists only when the source states both
// prices (ADR 014).

export type DealScope = "school" | "city" | "national";
export type DealCategory =
  "transport" | "fitness" | "culture" | "software" | "subscriptions" | "phone" | "food" | "other";
export type DealPeriod = "month" | "year" | "once";
export type DealStatus = "approved" | "pending" | "rejected" | "expired";

/** Cost-model lines a deal can reduce. Transport has no line of its own in v1. */
export const COST_LINE_IDS = ["otherExpenses", "food"] as const;
export type CostLineId = (typeof COST_LINE_IDS)[number];

/** An amount as the source states it, in the currency's minor units (cents for USD). */
export interface Money {
  amount: number;
  currency: string;
}

export interface Deal {
  id: string;
  /** Plain English, e.g. "Spotify Premium Student". */
  title: string;
  scope: DealScope;
  category: DealCategory;
  /** The line this deal reduces; defaults by category (see costLineOf). */
  costLine?: CostLineId;
  /** Only when the source states it. */
  studentPrice?: Money;
  /** Only when the source states it. Never a "typical" price. */
  regularPrice?: Money;
  period?: DealPeriod;
  /** Quoted or closely paraphrased from the source. */
  eligibility: string;
  /** e.g. "Book online and choose 'Free College - NYU'". */
  howToGet: string;
  /** https only, the official page where possible. */
  sourceUrl: string;
  /** Exact text from the source page supporting the deal. */
  sourceQuote: string;
  /** The date a human last verified the deal. */
  checkedOn: IsoDate;
  status: DealStatus;
}
