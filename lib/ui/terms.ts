import type { Season } from "@/lib/core/types";

export interface Term {
  year: number;
  season: Season;
}

export const termValue = (t: Term): string => `${t.year}-${t.season}`;

/** The next fall first (the brief's default), then alternating terms; the spring before it when still ahead. */
export function nextTerms(now: Date): Term[] {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const nextFall: Term = { year: m <= 7 ? y : y + 1, season: "fall" };
  const seq: Term[] = [nextFall];
  let cur: Term = nextFall;
  for (let i = 0; i < 3; i++) {
    cur =
      cur.season === "fall"
        ? { year: cur.year + 1, season: "spring" }
        : { year: cur.year, season: "fall" };
    seq.push(cur);
  }
  if (m >= 8) seq.push({ year: y + 1, season: "spring" });
  return seq;
}
