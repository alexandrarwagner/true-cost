/**
 * Snapshot College Scorecard cost fields for every school that publishes out-of-state tuition.
 *
 *   npm run snapshot:scorecard              # needs DATA_GOV_API_KEY in .env.local
 *   npm run snapshot:scorecard -- --max-pages 2
 *
 * About 70 pages of 100 at the 1,000 requests/hour limit. Writes data/snapshots/scorecard-costs.json.
 */
import { COST_FIELDS, SCORECARD_URL, type ScorecardRow } from "../lib/adapters/scorecard";
import { arg, fetchedAt, loadLocalEnv, writeSnapshot } from "./_snapshot";

async function main(): Promise<void> {
  loadLocalEnv();
  const key = process.env.DATA_GOV_API_KEY;
  if (!key) throw new Error("DATA_GOV_API_KEY is not set (put it in .env.local)");
  const maxPages = Number(arg("--max-pages") ?? 200);
  const schools: ScorecardRow[] = [];
  let page = 0;
  let total = Infinity;
  while (page < maxPages && schools.length < total) {
    const url = new URL(SCORECARD_URL);
    url.searchParams.set("fields", COST_FIELDS.join(","));
    url.searchParams.set("latest.cost.tuition.out_of_state__range", "1..");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const res = await fetch(url, {
      headers: { "x-api-key": key, accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Scorecard HTTP ${res.status} on page ${page}`);
    const json = (await res.json()) as { metadata: { total: number }; results: ScorecardRow[] };
    total = json.metadata.total;
    schools.push(...json.results);
    console.log(`page ${page}: ${schools.length}/${total}`);
    page++;
  }
  const path = writeSnapshot("scorecard-costs.json", {
    name: "scorecard-costs",
    fetchedAt: fetchedAt(),
    sourceVersion: `College Scorecard API v1 (api.data.gov), latest cost year, ${schools.length} schools`,
    schools,
  });
  console.log(`Wrote ${schools.length} schools -> ${path}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
