import { COLD_STATES, ESTIMATES, FEES } from "@/data/constants";
import { mulCents } from "../money";
import { empty, fromConstant, type ItemContext, type ItemGroup } from "./common";

/** Government fees before departure, settling-in costs on arrival, and leaving costs. */
export function oneOffItems(ctx: ItemContext): ItemGroup {
  const g = empty();
  const o = ctx.input.options;
  const dependants = Math.max(0, Math.floor(o.dependants ?? 0));
  const furnished =
    (o.housing?.kind ?? "on_campus") === "on_campus" || o.housing?.furnished === true;

  g.items.push(
    fromConstant(FEES.visaApplicationMrv, {
      id: "visaApplication",
      category: "one_off",
      amountUsd: mulCents(FEES.visaApplicationMrv.amountUsd, 1 + dependants),
      frequency: "one_off",
      phase: "pre_arrival",
      billing: "pre_arrival",
    }),
  );
  g.items.push(
    fromConstant(FEES.sevisI901F1, {
      id: "sevisFee",
      category: "one_off",
      frequency: "one_off",
      phase: "pre_arrival",
      billing: "pre_arrival",
    }),
  );
  g.items.push(
    fromConstant(FEES.visaIntegrityFee, {
      id: "visaIntegrityFee",
      category: "one_off",
      amountUsd: mulCents(FEES.visaIntegrityFee.amountUsd, 1 + dependants),
      frequency: "one_off",
      phase: "pre_arrival",
      billing: "pre_arrival",
      noteId: "may_apply",
    }),
  );
  g.items.push(
    fromConstant(ESTIMATES.preDeparture, {
      id: "preDeparture",
      category: "one_off",
      frequency: "one_off",
      phase: "pre_arrival",
      billing: "pre_arrival",
    }),
  );

  g.items.push(
    fromConstant(furnished ? ESTIMATES.homeSetupFurnished : ESTIMATES.homeSetupUnfurnished, {
      id: "homeSetup",
      category: "one_off",
      frequency: "one_off",
      phase: "arrival",
      billing: "arrival",
    }),
  );
  g.items.push(
    fromConstant(ESTIMATES.phoneSetup, {
      id: "phoneSetup",
      category: "one_off",
      frequency: "one_off",
      phase: "arrival",
      billing: "arrival",
    }),
  );
  g.items.push(
    fromConstant(ESTIMATES.transportCard, {
      id: "transportCard",
      category: "one_off",
      frequency: "one_off",
      phase: "arrival",
      billing: "arrival",
    }),
  );
  if (COLD_STATES.has(ctx.input.school.state.toUpperCase())) {
    g.items.push(
      fromConstant(ESTIMATES.winterClothing, {
        id: "winterClothing",
        category: "one_off",
        frequency: "one_off",
        phase: "arrival",
        billing: "arrival",
      }),
    );
  }
  g.items.push(
    fromConstant(ESTIMATES.shippingHome, {
      id: "shippingHome",
      category: "one_off",
      frequency: "one_off",
      phase: "departure",
      billing: "departure",
    }),
  );
  return g;
}
