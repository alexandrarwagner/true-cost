/**
 * Fails when any constant in data/constants.ts was last checked more than MAX_AGE_DAYS ago.
 * Runs in CI so stale fees and estimates block a merge until someone re-verifies them.
 */
import { ALL_CONSTANTS, MAX_AGE_DAYS } from "../data/constants";

const now = Date.now();
const stale = ALL_CONSTANTS.map((k) => ({
  id: k.id,
  ageDays: Math.floor((now - Date.parse(`${k.checkedOn}T00:00:00Z`)) / 86_400_000),
})).filter((k) => Number.isNaN(k.ageDays) || k.ageDays > MAX_AGE_DAYS);

if (stale.length > 0) {
  console.error(`Constants older than ${MAX_AGE_DAYS} days (re-verify and update checkedOn):`);
  for (const k of stale)
    console.error(`  ${k.id}: ${Number.isNaN(k.ageDays) ? "invalid date" : `${k.ageDays} days`}`);
  process.exit(1);
}
console.log(`All ${ALL_CONSTANTS.length} constants checked within ${MAX_AGE_DAYS} days.`);
