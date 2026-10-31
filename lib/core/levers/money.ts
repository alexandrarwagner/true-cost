import { TRANSFER_DEFAULT, TRANSFER_REFERENCE } from "@/data/constants";
import { withOptions } from "./common";
import type { Lever } from "./types";

const markupOf = (i: Parameters<Lever["applies"]>[0]) =>
  i.options.transfer?.markupBps ?? TRANSFER_DEFAULT.markupBps;
const feeOf = (i: Parameters<Lever["applies"]>[0]) =>
  i.options.transfer?.fixedFeeUsd ?? TRANSFER_DEFAULT.fixedFeeUsd;

/** Batch monthly living costs into one transfer per semester: fewer fixed fees, same markup. */
export const transfersFewer: Lever = {
  id: "transfers-fewer",
  excludes: [],
  applies: (i) =>
    i.options.payFromUsd !== true && feeOf(i) > 0 && i.options.transferCadence !== "semester",
  hasFigure: () => true,
  apply: (i) => withOptions(i, { transferCadence: "semester" }),
  confidence: (i) => (i.options.transfer ? "user" : "estimate"),
  noteId: () => "transfers_fewer",
};

/** Bring the markup down to the reference value. Names no provider. */
export const transferMarkup: Lever = {
  id: "transfer-markup",
  excludes: [],
  applies: (i) => i.options.payFromUsd !== true && markupOf(i) > TRANSFER_REFERENCE.markupBps,
  hasFigure: () => true,
  apply: (i) =>
    withOptions(i, {
      transfer: { markupBps: TRANSFER_REFERENCE.markupBps, fixedFeeUsd: feeOf(i) },
    }),
  confidence: () => TRANSFER_REFERENCE.confidence,
  noteId: () => "transfer_markup",
};

/**
 * Waive the school's plan for the user's own cover. A figure needs two things we rarely have:
 * a checked flag saying the school allows waivers, and the user's own premium. Otherwise a tip.
 */
export const insuranceWaiver: Lever = {
  id: "insurance-waiver",
  excludes: [],
  applies: (i) => i.options.insurance?.kind !== "waiver",
  hasFigure: (i, ctx) =>
    ctx.schoolFlags?.[String(i.school.unitId)]?.waiverAllowed === true &&
    i.options.insurance?.ownPremiumPerYearUsd !== undefined,
  apply: (i) => {
    const own = i.options.insurance?.ownPremiumPerYearUsd;
    if (own === undefined) return i;
    return withOptions(i, {
      insurance: { kind: "waiver", premiumPerYearUsd: own, ownPremiumPerYearUsd: own },
    });
  },
  confidence: () => "user",
  noteId: (i, ctx) =>
    ctx.schoolFlags?.[String(i.school.unitId)]?.waiverAllowed === true
      ? i.options.insurance?.ownPremiumPerYearUsd === undefined
        ? "insurance_waiver_enter_premium"
        : "insurance_waiver_figure"
      : "insurance_waiver_unknown",
};
