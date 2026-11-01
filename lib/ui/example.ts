import type { EstimateRequest } from "@/lib/schema/estimate";
import { nextTerms } from "./terms";

// "See an example first": a real school's published figures (from the fixtures that ship with
// the app, so it works whether or not DEMO_MODE is on) with today's exchange rates. Always
// labelled as sample figures; never the user's own numbers.
export function exampleRequest(now = new Date()): EstimateRequest {
  const term = nextTerms(now)[0] ?? { year: now.getUTCFullYear() + 1, season: "fall" as const };
  return {
    countryCode: "IN",
    homeCurrency: "INR",
    school: {
      unitId: 193900,
      name: "New York University",
      city: "New York",
      state: "NY",
      zip: "10012",
    },
    tuitionPerYear: 65622,
    tuitionSource: "school",
    degreeYears: 2,
    startTerm: { year: term.year, season: term.season },
    options: { housing: { kind: "off_campus", bedrooms: 1, roommates: 1 } },
    levers: [],
    example: true,
  };
}
