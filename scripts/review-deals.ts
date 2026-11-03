/**
 * A person reviews the drafts under data/deals/review, one at a time, with the source quote
 * and link in front of them. Approve moves a deal into the live file for its target with
 * status "approved" and today's checkedOn; reject marks it in the review file; skip leaves
 * it pending. Only this script, driven by a person, writes "approved" (ADR 014).
 *
 *   npm run review:deals
 *   npm run review:deals -- --yes     # the owner decided outside the prompt: approve every pending draft
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  CityDealsFileSchema,
  NationalDealsFileSchema,
  ReviewFileSchema,
  SchoolDealsFileSchema,
  type ReviewTarget,
} from "../lib/schema/deals";
import { slugId } from "../lib/deals/research";

const ROOT = join(process.cwd(), "data", "deals");
const REVIEW = join(ROOT, "review");
const today = new Date().toISOString().slice(0, 10);
const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

function liveFile(t: ReviewTarget): string {
  if (t.kind === "national") return join(ROOT, "national.json");
  if (t.kind === "city")
    return join(ROOT, "city", `${slugId(`${t.city}-${t.state}`, "x").replace(/^x-/, "")}.json`);
  return join(ROOT, "schools", `${slugId(t.school, "x").replace(/^x-/, "")}.json`);
}

function readLive(
  t: ReviewTarget,
  file: string,
): { header: Record<string, unknown>; deals: unknown[] } {
  if (!existsSync(file)) {
    const header =
      t.kind === "national"
        ? {}
        : t.kind === "city"
          ? { city: t.city, state: t.state }
          : { unitId: t.unitId, school: t.school };
    return { header, deals: [] };
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const schema =
    t.kind === "national"
      ? NationalDealsFileSchema
      : t.kind === "city"
        ? CityDealsFileSchema
        : SchoolDealsFileSchema;
  const parsed = schema.parse(raw);
  const { deals, ...header } = parsed as { deals: unknown[] } & Record<string, unknown>;
  return { header, deals };
}

async function main(): Promise<void> {
  const files = existsSync(REVIEW) ? readdirSync(REVIEW).filter((f) => f.endsWith(".json")) : [];
  if (files.length === 0) {
    console.log("Nothing to review under data/deals/review.");
    return;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let approved = 0;
  let rejected = 0;
  for (const name of files) {
    const path = join(REVIEW, name);
    const review = ReviewFileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const pending = review.deals.filter((d) => d.status === "pending");
    if (pending.length === 0) continue;
    console.log(`\n== ${name} (${pending.length} pending)`);
    const live = liveFile(review.target);
    const current = readLive(review.target, live);
    let approvedHere = 0;
    let rejectedHere = 0;
    for (const d of pending) {
      const price =
        d.studentPrice && d.regularPrice
          ? `${money(d.studentPrice.amount)} instead of ${money(d.regularPrice.amount)} per ${d.period}`
          : "no figure (the page states no regular price)";
      console.log(
        `\n${d.title}  [${d.category}]\n  ${price}\n  Who: ${d.eligibility}\n  How: ${d.howToGet}\n  Quote: "${d.sourceQuote}"\n  Source: ${d.sourceUrl}`,
      );
      const answer = process.argv.includes("--yes")
        ? "a"
        : (await rl.question("  approve / reject / skip [a/r/s]: ")).trim().toLowerCase();
      if (answer === "a") {
        if ((current.deals as { id: string }[]).some((x) => x.id === d.id)) {
          console.log("  already in the live file; skipped");
          continue;
        }
        current.deals.push({ ...d, status: "approved", checkedOn: today });
        d.status = "approved";
        approved++;
        approvedHere++;
      } else if (answer === "r") {
        d.status = "rejected";
        rejected++;
        rejectedHere++;
      }
    }
    // Only touch a file when a decision changed it.
    if (approvedHere > 0)
      writeFileSync(
        live,
        JSON.stringify({ ...current.header, deals: current.deals }, null, 2) + "\n",
      );
    if (approvedHere > 0 || rejectedHere > 0)
      writeFileSync(path, JSON.stringify(review, null, 2) + "\n");
  }
  rl.close();
  console.log(
    `\n${approved} approved, ${rejected} rejected. Run npm run check:deals, then commit.`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
