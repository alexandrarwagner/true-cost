/**
 * Validates every deal file against the schema (an approved deal without an https sourceUrl,
 * a sourceQuote or a checkedOn date fails here) and lists approved deals checked more than
 * DEAL_MAX_AGE_DAYS ago, which the app already hides. Runs in CI.
 */
import { ageInDays, DEAL_MAX_AGE_DAYS } from "../lib/core/deals";
import { readDealFiles } from "../lib/server/deals";

const today = new Date().toISOString().slice(0, 10);

let files;
try {
  files = readDealFiles();
} catch (err) {
  console.error("Deal data is invalid:", err instanceof Error ? err.message : err);
  process.exit(1);
}

const all = [
  ...files.schools.flatMap((f) => f.deals.map((d) => ({ where: f.school, d }))),
  ...files.cities.flatMap((f) => f.deals.map((d) => ({ where: `${f.city}, ${f.state}`, d }))),
  ...files.national.map((d) => ({ where: "national", d })),
];
const approved = all.filter(({ d }) => d.status === "approved");
const stale = approved.filter(({ d }) => ageInDays(d.checkedOn, today) > DEAL_MAX_AGE_DAYS);
const ids = new Set<string>();
const duplicates = all.filter(({ d }) => (ids.has(d.id) ? true : (ids.add(d.id), false)));

if (duplicates.length > 0) {
  console.error(`Duplicate deal ids: ${duplicates.map(({ d }) => d.id).join(", ")}`);
  process.exit(1);
}
console.log(
  `${all.length} deals in ${files.schools.length} school, ${files.cities.length} city and 1 national file; ${approved.length} approved.`,
);
for (const { where, d } of stale)
  console.warn(
    `  hidden (checked ${d.checkedOn}, over ${DEAL_MAX_AGE_DAYS} days): ${d.id} (${where})`,
  );
