import type { Category, Confidence, SourceId } from "@/lib/core/types";

// The "How we work it out" table's rows. The source ids are the registry's (data/sources.ts)
// and a unit test checks them against the sources the engine actually attaches to each
// category's line items, so the table cannot drift from the code.

export type MethodologyRow = {
  key: Category | "fx";
  sourceIds: SourceId[];
  /** The confidence marks a reader may see on these lines. */
  kinds: Confidence[];
};

export const METHODOLOGY: MethodologyRow[] = [
  { key: "tuition", sourceIds: ["user", "scorecard"], kinds: ["user", "school"] },
  {
    key: "housing",
    sourceIds: ["scorecard", "hud", "user", "rule", "constants"],
    kinds: ["school", "government", "user", "estimate"],
  },
  { key: "health_insurance", sourceIds: ["user", "constants"], kinds: ["user", "estimate"] },
  {
    key: "living",
    sourceIds: ["scorecard", "constants", "user"],
    kinds: ["school", "estimate", "user"],
  },
  { key: "one_off", sourceIds: ["constants", "user"], kinds: ["government", "estimate", "user"] },
  { key: "money_moving", sourceIds: ["user", "constants"], kinds: ["user", "estimate"] },
  { key: "fx", sourceIds: ["frankfurter"], kinds: ["government"] },
];
