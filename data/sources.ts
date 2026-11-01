import type { SourceId } from "@/lib/core/types";

// The source registry. Every Source an estimate carries names one of these ids, which is what
// the methodology table and the breakdown page print, so copy and code cannot drift apart.

export interface SourceInfo {
  name: string;
  url?: string;
  /** What this source provides, in plain words. */
  provides: string;
  licence: string;
}

export const SOURCES: Record<SourceId, SourceInfo> = {
  user: {
    name: "Your input",
    provides: "Tuition, scholarship, rent, premiums, fares and fees you typed in.",
    licence: "Yours. Never stored by us.",
  },
  scorecard: {
    name: "College Scorecard (US Department of Education)",
    url: "https://collegescorecard.ed.gov/data/",
    provides: "Published tuition, room and board, books and other expenses per school.",
    licence: "US government data, public domain.",
  },
  hud: {
    name: "HUD Fair Market Rents",
    url: "https://www.huduser.gov/portal/datasets/fmr.html",
    provides: "Typical rent by area and bedroom count, the 40th percentile of standard units.",
    licence: "US government data, public domain.",
  },
  frankfurter: {
    name: "Frankfurter (European Central Bank reference rates)",
    url: "https://frankfurter.dev",
    provides: "Today's exchange rate and daily history back to 2014.",
    licence: "Open source; rates free to use. We never predict them.",
  },
  constants: {
    name: "Hand-checked figures",
    provides:
      "Visa and SEVIS fees, flights by region and the estimates with bands in data/constants.ts, each with its own source and checked-on date.",
    licence: "Various public sources, cited per figure.",
  },
  rule: {
    name: "A rule of the model",
    provides: "Figures that follow from another, such as a deposit equal to one month's rent.",
    licence: "Ours.",
  },
  deal: {
    name: "An approved student deal",
    provides: "Prices quoted from the deal's own source page, checked by a person.",
    licence: "Quoted from the source, with a link.",
  },
};

export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];
