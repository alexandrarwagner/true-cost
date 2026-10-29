import { usd } from "@/lib/core/money";
import type { AreaRent, EstimateInput, SchoolCosts } from "@/lib/core/types";

export const TODAY = "2026-10-29";

export const PURDUE: SchoolCosts = {
  roomBoardOnCampusUsd: usd(12820),
  roomBoardOffCampusUsd: usd(12820),
  otherExpenseOnCampusUsd: usd(2340),
  otherExpenseOffCampusUsd: usd(2340),
  booksSupplyUsd: usd(1090),
  source: {
    kind: "school",
    name: "College Scorecard",
    url: "https://collegescorecard.ed.gov",
    date: "2024-01-01",
  },
};

export const LAFAYETTE_RENT: AreaRent = {
  monthlyByBedrooms: { 0: usd(850), 1: usd(950), 2: usd(1150), 3: usd(1500), 4: usd(1700) },
  areaName: "Lafayette-West Lafayette, IN",
  smallArea: false,
  source: {
    kind: "government",
    name: "HUD FMR FY2027",
    url: "https://www.huduser.gov",
    date: "2026-10-01",
  },
};

export const NYC_RENT: AreaRent = {
  monthlyByBedrooms: { 0: usd(2400), 1: usd(2700), 2: usd(3100), 3: usd(3900), 4: usd(4200) },
  areaName: "New York, NY",
  smallArea: true,
  source: {
    kind: "government",
    name: "HUD FMR FY2027",
    url: "https://www.huduser.gov",
    date: "2026-10-01",
  },
};

export const NYU: SchoolCosts = {
  roomBoardOnCampusUsd: usd(23000),
  otherExpenseOnCampusUsd: usd(3200),
  otherExpenseOffCampusUsd: usd(3200),
  booksSupplyUsd: usd(900),
  source: {
    kind: "school",
    name: "College Scorecard",
    url: "https://collegescorecard.ed.gov",
    date: "2024-01-01",
  },
};

export function baseInput(over: Partial<EstimateInput> = {}): EstimateInput {
  return {
    countryCode: "IN",
    homeCurrency: "INR",
    school: {
      unitId: 243780,
      name: "Purdue University-Main Campus",
      city: "West Lafayette",
      state: "IN",
      zip: "47907",
    },
    tuitionPerYearUsd: usd(28794),
    tuitionSource: {
      kind: "school",
      name: "College Scorecard",
      url: "https://collegescorecard.ed.gov",
      date: "2024-01-01",
    },
    degreeYears: 2,
    startTerm: { year: 2027, season: "fall" },
    options: {},
    ...over,
  };
}
