import type { Constant } from "@/data/constants";
import type { AreaRent, Cents, EstimateInput, LineItem, SchoolCosts, Source } from "../types";

export interface ItemContext {
  input: EstimateInput;
  school?: SchoolCosts;
  rent?: AreaRent;
  today: string;
  user: Source;
}

export interface ItemGroup {
  items: LineItem[];
  noteIds: string[];
  comparisons: Array<{ itemId: string; alternativeUsd: Cents; alternativeSource: Source }>;
}

export const empty = (): ItemGroup => ({ items: [], noteIds: [], comparisons: [] });

type Over = Omit<LineItem, "amountUsd" | "range" | "source" | "id"> & {
  id?: string;
  amountUsd?: Cents;
};

/** A line item from a hand-curated constant, keeping its band and source. */
export function fromConstant(k: Constant, over: Over): LineItem {
  return {
    id: over.id ?? k.id,
    amountUsd: over.amountUsd ?? k.amountUsd,
    ...(k.range ? { range: k.range } : {}),
    source: k.source,
    ...over,
  };
}
