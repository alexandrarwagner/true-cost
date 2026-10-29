import { usd } from "@/lib/core/money";
import type { AreaRent, Cents, RatePoint, SchoolCosts, Source } from "@/lib/core/types";
import type {
  DataSources,
  FxSource,
  RentSource,
  SchoolSource,
  SchoolSummary,
} from "@/lib/adapters/types";
import fxLatest from "./fixtures/fx-latest.json";
import hudSample from "./fixtures/hud-fmr-sample.json";
import scorecard from "./fixtures/scorecard-schools.json";
import { syntheticHistory } from "./syntheticFx";

// Fixture-backed sources for DEMO_MODE and tests. Scorecard and today's FX rates are real
// values recorded on the date in each fixture; rent and FX history are labelled samples.

type ScorecardRow = Record<string, string | number | boolean | null>;

const SCORECARD_SOURCE: Source = {
  kind: "school",
  name: "College Scorecard (fixture)",
  url: scorecard.source,
  date: scorecard.fetchedAt.slice(0, 10),
};
const HUD_SOURCE: Source = {
  kind: "estimate",
  name: "Rent sample in HUD FMR shape (fixture)",
  date: hudSample.fetchedAt.slice(0, 10),
};

function num(row: ScorecardRow, key: string): number | undefined {
  const v = row[key];
  return typeof v === "number" ? v : undefined;
}

function toSummary(row: ScorecardRow): SchoolSummary {
  const tuition = num(row, "latest.cost.tuition.out_of_state");
  const degree = num(row, "school.degrees_awarded.predominant");
  return {
    unitId: Number(row["id"]),
    name: String(row["school.name"]),
    city: String(row["school.city"]),
    state: String(row["school.state"]),
    zip: String(row["school.zip"]).slice(0, 5),
    ...(tuition !== undefined ? { tuitionOutOfStateUsd: usd(tuition) } : {}),
    ...(degree !== undefined ? { predominantDegree: degree } : {}),
  };
}

function toCosts(row: ScorecardRow): SchoolCosts {
  const c = (key: string): Cents | undefined => {
    const v = num(row, key);
    return v === undefined ? undefined : usd(v);
  };
  const out: SchoolCosts = { source: SCORECARD_SOURCE };
  const rbOn = c("latest.cost.roomboard.oncampus");
  const rbOff = c("latest.cost.roomboard.offcampus");
  const oeOn = c("latest.cost.otherexpense.oncampus");
  const oeOff = c("latest.cost.otherexpense.offcampus");
  const books = c("latest.cost.booksupply");
  if (rbOn !== undefined) out.roomBoardOnCampusUsd = rbOn;
  if (rbOff !== undefined) out.roomBoardOffCampusUsd = rbOff;
  if (oeOn !== undefined) out.otherExpenseOnCampusUsd = oeOn;
  if (oeOff !== undefined) out.otherExpenseOffCampusUsd = oeOff;
  if (books !== undefined) out.booksSupplyUsd = books;
  return out;
}

const ROWS = scorecard.schools as ScorecardRow[];

export const mockSchools: SchoolSource = {
  async search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ROWS.filter((r) => String(r["school.name"]).toLowerCase().includes(q))
      .slice(0, 10)
      .map(toSummary);
  },
  async costs(unitId) {
    const row = ROWS.find((r) => Number(r["id"]) === unitId);
    return row ? { summary: toSummary(row), costs: toCosts(row) } : null;
  },
};

export const mockRent: RentSource = {
  async forArea(_zip, state) {
    const area = hudSample.areas.find((a) => a.state === state.toUpperCase());
    if (!area) return null;
    const m = area.monthly as Record<string, number>;
    const rent: AreaRent = {
      monthlyByBedrooms: {
        0: usd(m["0"] ?? 0),
        1: usd(m["1"] ?? 0),
        2: usd(m["2"] ?? 0),
        3: usd(m["3"] ?? 0),
        4: usd(m["4"] ?? 0),
      },
      areaName: area.areaName,
      smallArea: area.smallArea,
      source: HUD_SOURCE,
    };
    return rent;
  },
};

const LATEST = fxLatest.rates as Array<{ date: string; base: string; quote: string; rate: number }>;

export const mockFx: FxSource = {
  async latest(currency) {
    if (currency.toUpperCase() === "USD")
      return { date: fxLatest.fetchedAt.slice(0, 10), rate: 1, source: "US dollar account" };
    const row = LATEST.find((r) => r.quote === currency.toUpperCase());
    return row
      ? {
          date: row.date,
          rate: row.rate,
          source: `${fxLatest.sourceVersion} (fixture, ${row.date})`,
        }
      : null;
  },
  async history(currency): Promise<RatePoint[]> {
    const row = LATEST.find((r) => r.quote === currency.toUpperCase());
    if (!row) return [];
    // Sample history anchored so the last point is today's real rate. Labelled as sample data.
    return syntheticHistory({
      from: "2010-01-01",
      to: row.date,
      startRate: row.rate / 1.9,
      driftPerYear: 0.055,
      waveAmplitude: 0.04,
    });
  },
};

export const mockSources: DataSources = {
  schools: mockSchools,
  rent: mockRent,
  fx: mockFx,
  demo: true,
};
