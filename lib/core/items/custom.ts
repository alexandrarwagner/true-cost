import { derive, usdTerm } from "../derive";
import type { Term } from "../types";
import { empty, type ItemContext, type ItemGroup } from "./common";

/** "Know a cost we missed?": the user's own items, as ordinary line items with confidence "user". */
export function customItems(ctx: ItemContext): ItemGroup {
  const g = empty();
  (ctx.input.options.customCosts ?? []).forEach((c, i) => {
    const terms: Term[] = [usdTerm("your_amount", c.amountUsd, "user")];
    if (c.converted)
      terms.push(
        { label: "entered_in_home_currency", value: c.converted.amountHome, unit: "home" },
        { label: "rate_on_entry", value: c.converted.rate, unit: "rate" },
      );
    const d = derive("given", terms);
    const monthly = c.frequency === "monthly";
    g.items.push({
      id: `custom-${i}`,
      category: monthly ? "living" : "one_off",
      amountUsd: d.amountUsd,
      derivation: d.derivation,
      frequency: monthly ? "per_month" : "one_off",
      phase: monthly ? "ongoing" : "arrival",
      billing: monthly ? "monthly" : "arrival",
      source: ctx.user,
      noteId: "custom_cost",
    });
  });
  return g;
}
