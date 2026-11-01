import { derive, usdTerm } from "../derive";
import type { Cents } from "../types";
import { empty, given, type ItemContext, type ItemGroup } from "./common";

/** Tuition net of scholarship, billed per semester; the enrolment deposit is credited to the first bill. */
export function tuitionItems(ctx: ItemContext): ItemGroup {
  const g = empty();
  const o = ctx.input.options;
  const scholarship = o.scholarshipPerYearUsd ?? (0 as Cents);
  const src = ctx.input.tuitionSource;
  const net =
    scholarship > 0
      ? derive("difference", [
          usdTerm("tuition_per_year", ctx.input.tuitionPerYearUsd, src.id),
          usdTerm("scholarship_per_year", scholarship, "user"),
        ])
      : derive("given", [usdTerm("tuition_per_year", ctx.input.tuitionPerYearUsd, src.id)]);
  if (scholarship > 0)
    g.noteIds.push(
      scholarship > ctx.input.tuitionPerYearUsd
        ? "scholarship_exceeds_tuition"
        : "scholarship_applied",
    );
  g.items.push({
    id: "tuition",
    category: "tuition",
    amountUsd: net.amountUsd,
    derivation: net.derivation,
    frequency: "per_year",
    phase: "ongoing",
    billing: "semester",
    source: src,
  });
  if (o.enrolmentDepositUsd && o.enrolmentDepositUsd > 0) {
    g.items.push({
      id: "enrolmentDeposit",
      category: "tuition",
      ...given("enrolment_deposit", o.enrolmentDepositUsd, ctx.user),
      frequency: "one_off",
      phase: "pre_arrival",
      billing: "pre_arrival",
      creditAgainst: { itemId: "tuition", occurrence: "first" },
      timingOnly: true,
      noteId: "deposit_credited_to_tuition",
    });
  }
  return g;
}
