/**
 * Snapshot HUD Fair Market Rents for every state from fmr/statedata/{state}.
 *
 *   npm run snapshot:hud                 # needs HUD_API_TOKEN in .env.local
 *   npm run snapshot:hud -- --year 2027 --only IN,NY
 *
 * Fifty-odd requests. Writes data/snapshots/hud-fmr.json. Small Area FMRs (ZIP level) are
 * not yet read: see docs/data-sources.md.
 */
import { fetchStateData, HUD_FY, type SnapshotArea } from "../lib/adapters/hud";
import { arg, fetchedAt, loadLocalEnv, writeSnapshot } from "./_snapshot";

const STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "PR",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

async function main(): Promise<void> {
  loadLocalEnv();
  const token = process.env.HUD_API_TOKEN;
  if (!token) throw new Error("HUD_API_TOKEN is not set (put it in .env.local)");
  const year = Number(arg("--year") ?? HUD_FY);
  const only = arg("--only")
    ?.split(",")
    .map((s) => s.trim().toUpperCase());
  const byState: Record<string, SnapshotArea[]> = {};
  for (const st of STATES.filter((s) => !only || only.includes(s))) {
    const areas = await fetchStateData(st, token, AbortSignal.timeout(30_000), year);
    byState[st] = areas;
    console.log(`${st}: ${areas.length} areas`);
    if (areas.length === 0)
      console.warn(
        `  ${st}: no areas parsed; check the response shape against lib/adapters/hud.ts`,
      );
  }
  const path = writeSnapshot("hud-fmr.json", {
    name: "hud-fmr",
    fetchedAt: fetchedAt(),
    sourceVersion: `HUD Fair Market Rents FY${year}, fmr/statedata per state`,
    fiscalYear: year,
    byState,
  });
  console.log(`Wrote ${Object.keys(byState).length} states -> ${path}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
