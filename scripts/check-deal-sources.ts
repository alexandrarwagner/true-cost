/**
 * Re-checks every approved deal against its source page: is the quote we rely on still
 * there? Runs weekly in CI (.github/workflows/check-deals.yml), which opens or updates an
 * issue from the report when a quote has gone. Changes no data: a person decides.
 *
 *   npm run check:deal-sources                 # prints the report
 *   npm run check:deal-sources -- --report out.md --strict   # also fails when a quote is missing
 */
import { writeFileSync } from "node:fs";
import { htmlToText } from "../lib/deals/research";
import {
  buildReport,
  checkSource,
  needsAttention,
  summarise,
  type SourceCheck,
} from "../lib/deals/freshness";
import { readDealFiles } from "../lib/server/deals";
import { arg } from "./_snapshot";

const today = new Date().toISOString().slice(0, 10);
const CONCURRENCY = 3;

async function fetchText(url: string): Promise<{ text: string | null; detail?: string }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (tuition-plus deals check)" },
    });
    if (!res.ok) return { text: null, detail: `HTTP ${res.status}` };
    const body = await res.text();
    return { text: htmlToText(body.slice(0, 2 * 1024 * 1024)) };
  } catch (err) {
    return { text: null, detail: err instanceof Error ? err.name : "error" };
  }
}

async function main(): Promise<void> {
  const files = readDealFiles();
  const approved = [
    ...files.national.map((d) => ({ where: "national", d })),
    ...files.cities.flatMap((f) => f.deals.map((d) => ({ where: `${f.city}, ${f.state}`, d }))),
    ...files.schools.flatMap((f) => f.deals.map((d) => ({ where: f.school, d }))),
  ].filter(({ d }) => d.status === "approved");

  const checks: SourceCheck[] = [];
  const queue = [...approved];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const { text, detail } = await fetchText(item.d.sourceUrl);
        checks.push(checkSource(item.d, item.where, text, detail));
      }
    }),
  );
  checks.sort((a, b) => a.id.localeCompare(b.id));

  const report = buildReport(checks, today);
  const out = arg("--report");
  if (out) writeFileSync(out, report);
  else process.stdout.write(report);
  const n = summarise(checks);
  console.error(
    `${n.ok} ok, ${n.quote_missing} quote missing, ${n.unreachable} unreachable, of ${checks.length} approved deals.`,
  );
  if (process.argv.includes("--strict") && needsAttention(checks)) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
