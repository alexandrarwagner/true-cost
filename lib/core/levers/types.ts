import type { Deal } from "../deals";
import type { EstimateContext } from "../estimate";
import type { Cents, Confidence, Estimate, EstimateInput, Minor, SchoolFlags } from "../types";

// A lever is a counterfactual: change one thing in the user's inputs, re-run the engine, show
// the difference. Levers never add up; a combined figure is its own scenario (ADR 013).

export const LEVER_IDS = [
  "housing-oncampus",
  "roommates-1",
  "roommates-2",
  "lease-12-vs-9",
  "insurance-waiver",
  "transfers-fewer",
  "transfer-markup",
  "flights-fewer",
] as const;
export type BuiltinLeverId = (typeof LEVER_IDS)[number];

/** Student deals are levers too, keyed by the deal's id. */
export const DEAL_LEVER_PREFIX = "deal:";
export type DealLeverId = `${typeof DEAL_LEVER_PREFIX}${string}`;
export type LeverId = BuiltinLeverId | DealLeverId;

const DEAL_ID = /^deal:[a-z0-9][a-z0-9-]{0,62}$/;
export function isLeverId(value: string): value is LeverId {
  return (LEVER_IDS as readonly string[]).includes(value) || DEAL_ID.test(value);
}

export interface LeverContext extends EstimateContext {
  schoolFlags?: SchoolFlags;
  /** Approved, fresh deals for this school, its city and the country. */
  deals?: Deal[];
}

export interface Lever {
  id: LeverId;
  /** Deals skip the saving threshold and show as tips when they have no figure. */
  kind: "lever" | "deal";
  /** Levers that cannot be on together; the UI disables these while this one is on. */
  excludes: LeverId[];
  applies(input: EstimateInput, ctx: LeverContext): boolean;
  /** False when the lever is a tip with no counterfactual (policy unknown, figure missing). */
  hasFigure(input: EstimateInput, ctx: LeverContext): boolean;
  /** Sets an absolute target read from `baseline`, so applying twice equals applying once. */
  apply(input: EstimateInput, baseline: EstimateInput): EstimateInput;
  confidence(input: EstimateInput, ctx: LeverContext): Confidence;
  /** Copy key for the one-line "how" under the title. */
  noteId(input: EstimateInput, ctx: LeverContext): string;
}

export interface RankedLever {
  id: LeverId;
  /** baseline.total minus the scenario's total; zero for a tip. */
  savingUsd: Cents;
  /** At the baseline's rate, the same rate for every lever. Absent in USD or when tip. */
  savingHome?: Minor;
  hasFigure: boolean;
  confidence: Confidence;
  noteId: string;
  excludes: LeverId[];
  /** Present for a deal row: what to show and where it came from. */
  deal?: Deal;
}

export interface RankOptions {
  /** Minimum saving over the degree for a lever to show. */
  thresholdUsd: Cents;
}

export type Scenario = { input: EstimateInput; estimate: Estimate };
