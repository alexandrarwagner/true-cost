import { withOptions } from "./common";
import type { Lever } from "./types";

const tripsOf = (i: Parameters<Lever["applies"]>[0]) =>
  Math.max(0, i.options.flights?.tripsHomePerYear ?? 1);

/** One fewer trip home a year than the baseline. A personal choice, phrased as one. */
export const flightsFewer: Lever = {
  id: "flights-fewer",
  kind: "lever",
  excludes: [],
  applies: (i) => tripsOf(i) >= 1,
  hasFigure: () => true,
  apply: (i, baseline) =>
    withOptions(i, {
      flights: {
        ...(i.options.flights ?? {}),
        tripsHomePerYear: Math.max(0, tripsOf(baseline) - 1),
      },
    }),
  confidence: (i) => (i.options.flights?.oneWayUsd !== undefined ? "user" : "estimate"),
  noteId: () => "flights_fewer",
};
