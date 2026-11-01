import { housingOf, dependantsOf, withOptions } from "./common";
import type { Lever } from "./types";

/** Switch to the school's published room and meals. Not offered to families. */
export const housingOnCampus: Lever = {
  id: "housing-oncampus",
  kind: "lever",
  excludes: ["roommates-1", "roommates-2", "lease-12-vs-9"],
  applies: (i, ctx) =>
    housingOf(i).kind === "off_campus" &&
    ctx.school?.roomBoardOnCampusUsd !== undefined &&
    dependantsOf(i) === 0,
  hasFigure: () => true,
  apply: (i) => withOptions(i, { housing: { kind: "on_campus", bedrooms: 1, roommates: 0 } }),
  confidence: (_, ctx) => ctx.school?.source.kind ?? "estimate",
  noteId: () => "housing_oncampus",
};

/** Share the area's rent for the same place with N roommates. Only on HUD-priced rent. */
function roommates(n: 1 | 2): Lever {
  return {
    id: n === 1 ? "roommates-1" : "roommates-2",
    kind: "lever",
    excludes: ["housing-oncampus"],
    applies: (i) => {
      const h = housingOf(i);
      return h.kind === "off_campus" && h.roommates < n && h.monthlyRentUsd === undefined;
    },
    hasFigure: () => true,
    apply: (i) => withOptions(i, { housing: { ...housingOf(i), roommates: n } }),
    confidence: (_, ctx) => ctx.rent?.source.kind ?? "estimate",
    noteId: () => (n === 1 ? "roommates_1" : "roommates_2"),
  };
}
export const roommates1 = roommates(1);
export const roommates2 = roommates(2);

/** Drop the summer and overlap rent of a 12-month lease, if a shorter one can be found. */
export const lease12vs9: Lever = {
  id: "lease-12-vs-9",
  kind: "lever",
  excludes: ["housing-oncampus"],
  applies: (i) => housingOf(i).kind === "off_campus" && housingOf(i).twelveMonthLease === true,
  hasFigure: () => true,
  apply: (i) => withOptions(i, { housing: { ...housingOf(i), twelveMonthLease: false } }),
  confidence: () => "estimate",
  noteId: () => "lease_12_vs_9",
};
