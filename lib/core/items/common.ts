import type { Constant } from "@/data/constants";
import { derive, usdTerm } from "../derive";
import type {
  AreaRent,
  Cents,
  Derivation,
  EstimateInput,
  LineItem,
  SchoolCosts,
  Source,
} from "../types";

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

type Over = Omit<LineItem, "amountUsd" | "range" | "source" | "id" | "derivation"> & {
  id?: string;
  /** Only with a matching derivation; otherwise the constant's own figure is used as given. */
  amountUsd?: Cents;
  derivation?: Derivation;
};

/** A line item from a hand-curated constant, keeping its band and source. */
export function fromConstant(k: Constant, over: Over): LineItem {
  const given = derive("given", [usdTerm(k.id, k.amountUsd, k.source.id)]);
  const { amountUsd, derivation } = over;
  return {
    id: over.id ?? k.id,
    amountUsd: amountUsd ?? given.amountUsd,
    derivation: derivation ?? given.derivation,
    ...(k.range ? { range: k.range } : {}),
    source: k.source,
    ...over,
  };
}

/** A line item whose amount is a figure a source states, with no arithmetic. */
export function given(
  label: string,
  amountUsd: Cents,
  source: Source,
): Pick<LineItem, "amountUsd" | "derivation" | "source"> {
  const d = derive("given", [usdTerm(label, amountUsd, source.id)]);
  return { amountUsd: d.amountUsd, derivation: d.derivation, source };
}
