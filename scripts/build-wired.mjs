/**
 * The designer's export becomes the served page, by script (decision 14).
 *
 *   node scripts/build-wired.mjs                  # from design/source/v2-index.html
 *   node scripts/build-wired.mjs <export.html>    # a new drop
 *   node scripts/build-wired.mjs --accept-blocks  # after merging a changed script by hand
 *
 * What it does, and nothing else:
 *   1. copies the export to tests/design/baseline.html (the design lock's "as delivered");
 *   2. for each script block listed in tests/design/allowed-diffs.json (found by its `sig`),
 *      saves the designer's body under tests/design/blocks/ and puts the `to` tag in its place;
 *   3. applies each text edit in allowed-diffs.json, which must match exactly once;
 *   4. refuses to finish if an inline script is left, or if a designer's script block changed
 *      since the live file under design/wired was last merged from it (blocks.lock.json):
 *      merge design/wired/<file> by hand, then run again with --accept-blocks.
 *
 * The live page scripts under design/wired are ours to maintain; the designer's originals
 * under tests/design/blocks are what they were merged from. See docs/decisions/016.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const accept = args.includes("--accept-blocks");
const source = args.find((a) => !a.startsWith("--")) ?? "design/source/v2-index.html";
const EDITS = "tests/design/allowed-diffs.json";
const BLOCKS = "tests/design/blocks";
const LOCK = "tests/design/blocks.lock.json";
const OUT = "design/wired/E-homepage-wired.html";
const BASELINE = "tests/design/baseline.html";

const fail = (msg) => {
  console.error(`build-wired: ${msg}`);
  process.exit(1);
};
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

const html = readFileSync(join(root, source), "utf8");
const edits = JSON.parse(readFileSync(join(root, EDITS), "utf8"));
const lock = existsSync(join(root, LOCK)) ? JSON.parse(readFileSync(join(root, LOCK), "utf8")) : {};

// 1. The delivered file, untouched.
writeFileSync(join(root, BASELINE), html);

// 2. Script blocks: found by signature, saved as delivered, replaced by the tag(s) in `to`.
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
let page = html;
const changed = [];
const seen = new Set();
mkdirSync(join(root, BLOCKS), { recursive: true });
for (const e of edits) {
  if (!("block" in e)) continue;
  if (!e.sig) fail(`block entry ${e.block} has no "sig" to find it by`);
  const hits = blocks.filter((m) => m[1].includes(e.sig));
  if (hits.length !== 1)
    fail(`signature for ${e.block} matched ${hits.length} script blocks (expected 1): ${e.sig}`);
  const body = hits[0][1];
  if (seen.has(hits[0].index)) fail(`two entries claim the same script block (${e.block})`);
  seen.add(hits[0].index);
  writeFileSync(join(root, BLOCKS, e.block), body);
  const hash = sha(body);
  if (lock[e.block] !== hash) changed.push(e.block);
  lock[e.block] = hash;
  page = page.replace(hits[0][0], () => e.to);
}

// 3. Text edits, each exactly once.
for (const e of edits) {
  if ("block" in e) continue;
  const n = page.split(e.from).length - 1;
  if (n !== 1) fail(`text edit matched ${n} times (expected 1): ${e.change.slice(0, 80)}`);
  page = page.replace(e.from, () => e.to);
}

// 4. Guards.
const inline = page.match(/<script(?![^>]*\ssrc=)[^>]*>/g) ?? [];
if (inline.length) fail(`${inline.length} inline script(s) left; add a block entry for each`);
if (changed.length && !accept)
  fail(
    `the designer's script changed since the live file was merged: ${changed.join(", ")}.\n` +
      `Merge design/wired/<file> (git merge-file ours base theirs), then run again with --accept-blocks.`,
  );
if (changed.length) writeFileSync(join(root, LOCK), JSON.stringify(lock, null, 2) + "\n");

writeFileSync(join(root, OUT), page);
console.log(
  `built ${OUT} from ${source}: ${edits.filter((e) => "block" in e).length} scripts moved, ${edits.filter((e) => "from" in e).length} text edits${changed.length ? `, accepted ${changed.length} changed block(s)` : ""}`,
);
