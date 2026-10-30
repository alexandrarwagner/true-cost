/**
 * Snapshot daily USD exchange-rate history for every launch currency from Frankfurter v2.
 *
 *   npm run snapshot:fx            # all ten currencies from 2010-01-01 to today
 *   npm run snapshot:fx -- --from 2015-01-01 --only INR,KRW
 *
 * No key needed. Writes data/snapshots/fx-{CUR}.json.
 */
import { COUNTRIES } from "../data/countries";
import { fetchRates, HISTORY_FROM, SOURCE_NAME } from "../lib/adapters/frankfurter";
import { arg, fetchedAt, writeSnapshot } from "./_snapshot";

async function main(): Promise<void> {
  const from = arg("--from") ?? HISTORY_FROM;
  const to = new Date().toISOString().slice(0, 10);
  const only = arg("--only")
    ?.split(",")
    .map((c) => c.trim().toUpperCase());
  const currencies = COUNTRIES.map((c) => c.currency).filter((c) => !only || only.includes(c));
  for (const cur of currencies) {
    const points = await fetchRates({ quotes: cur, from, to }, AbortSignal.timeout(30_000), 30_000);
    const path = writeSnapshot(`fx-${cur}.json`, {
      name: `fx-${cur}`,
      fetchedAt: fetchedAt(),
      sourceVersion: `${SOURCE_NAME}, USD/${cur}, daily, ${from} to ${to}`,
      currency: cur,
      points,
    });
    console.log(
      `${cur}: ${points.length} points (${points[0]?.date} to ${points.at(-1)?.date}) -> ${path}`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
