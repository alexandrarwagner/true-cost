import { addCents, clampNonNegative } from "../money";
import type { Cents } from "../types";
import { empty, type ItemContext, type ItemGroup } from "./common";

/** Tuition net of scholarship, billed per semester; the enrolment deposit is credited to the first bill. */
export function tuitionItems(ctx: ItemContext): ItemGroup {
  const g = empty();
  const o = ctx.input.options;
  const scholarship = o.scholarshipPerYearUsd ?? (0 as Cents);
  const net = clampNonNegative(addCents(ctx.input.tuitionPerYearUsd, -scholarship as Cents));
  if (scholarship > 0)
    g.noteIds.push(
      scholarship > ctx.input.tuitionPerYearUsd
        ? "scholarship_exceeds_tuition"
        : "scholarship_applied",
    );
  g.items.push({
    id: "tuition",
    category: "tuition",
    amountUsd: net,
    frequency: "per_year",
    phase: "ongoing",
    billing: "semester",
    source: ctx.input.tuitionSource,
  });
  if (o.enrolmentDepositUsd && o.enrolmentDepositUsd > 0) {
    g.items.push({
      id: "enrolmentDeposit",
      category: "tuition",
      amountUsd: o.enrolmentDepositUsd,
      frequency: "one_off",
      phase: "pre_arrival",
      billing: "pre_arrival",
      creditAgainst: { itemId: "tuition", occurrence: "first" },
      source: ctx.user,
      timingOnly: true,
      noteId: "deposit_credited_to_tuition",
    });
  }
  return g;
}
