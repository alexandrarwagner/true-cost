import { FLIGHT_ONE_WAY_BY_REGION, REGION_BY_COUNTRY } from "@/data/constants";
import { countTerm, derive, usdTerm } from "../derive";
import { mulCents } from "../money";
import { empty, type ItemContext, type ItemGroup } from "./common";

/** Flight out, trips home and the flight back, by region unless the user knows the fare. */
export function travelItems(ctx: ItemContext): ItemGroup {
  const g = empty();
  const o = ctx.input.options;
  const region = REGION_BY_COUNTRY[ctx.input.countryCode.toUpperCase()] ?? "southAsia";
  const k = FLIGHT_ONE_WAY_BY_REGION[region];
  const known = o.flights?.oneWayUsd;
  const oneWay = known ?? k.amountUsd;
  const source = known !== undefined ? ctx.user : k.source;
  const range = known !== undefined ? undefined : k.range;
  const trips = Math.max(0, o.flights?.tripsHomePerYear ?? 1);
  const fare = usdTerm(
    known !== undefined ? "your_one_way_fare" : "one_way_fare_by_region",
    oneWay,
    source.id,
  );
  const single = derive("given", [fare]);

  g.items.push({
    id: "flightToSchool",
    category: "one_off",
    amountUsd: single.amountUsd,
    derivation: single.derivation,
    ...(range ? { range } : {}),
    frequency: "one_off",
    phase: "pre_arrival",
    billing: "pre_arrival",
    source,
  });
  if (trips > 0) {
    const d = derive("product", [
      fare,
      countTerm("flights_per_trip", 2),
      countTerm("trips_per_year", trips),
    ]);
    g.items.push({
      id: "flightsHome",
      category: "one_off",
      amountUsd: d.amountUsd,
      derivation: d.derivation,
      ...(range
        ? { range: { low: mulCents(range.low, 2 * trips), high: mulCents(range.high, 2 * trips) } }
        : {}),
      frequency: "per_year",
      phase: "ongoing",
      billing: "winter_break",
      source,
    });
  }
  g.items.push({
    id: "finalFlight",
    category: "one_off",
    amountUsd: single.amountUsd,
    derivation: single.derivation,
    ...(range ? { range } : {}),
    frequency: "one_off",
    phase: "departure",
    billing: "departure",
    source,
  });
  return g;
}
