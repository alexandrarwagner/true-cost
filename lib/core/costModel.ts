import type { AreaRent, EstimateInput, LineItem, SchoolCosts, Source } from "./types";
import type { ItemContext, ItemGroup } from "./items/common";
import { customItems } from "./items/custom";
import { housingItems } from "./items/housing";
import { livingItems } from "./items/living";
import { oneOffItems } from "./items/oneOffs";
import { travelItems } from "./items/travel";
import { tuitionItems } from "./items/tuition";

// Builds every line item from the inputs and whatever data is available. Pure. Anything
// missing becomes a labelled estimate; nothing is silently invented. Each group of items
// lives in lib/core/items; this file only assembles them, in display order.

export interface CostModelData {
  school?: SchoolCosts;
  rent?: AreaRent;
}

export interface CostModelResult {
  items: LineItem[];
  noteIds: string[];
  comparisons: ItemGroup["comparisons"];
}

export function buildLineItems(
  input: EstimateInput,
  data: CostModelData,
  today: string,
): CostModelResult {
  const user: Source = { id: "user", kind: "user", name: "Your input", date: today };
  const ctx: ItemContext = {
    input,
    today,
    user,
    ...(data.school ? { school: data.school } : {}),
    ...(data.rent ? { rent: data.rent } : {}),
  };
  const groups = [
    tuitionItems(ctx),
    livingItems(ctx),
    housingItems(ctx),
    travelItems(ctx),
    oneOffItems(ctx),
    customItems(ctx),
  ];
  return {
    items: groups.flatMap((g) => g.items),
    noteIds: groups.flatMap((g) => g.noteIds),
    comparisons: groups.flatMap((g) => g.comparisons),
  };
}
