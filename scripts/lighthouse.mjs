// Lighthouse on a phone profile against a running production server, gated on the design
// brief's target: performance 90 or more, plus accessibility and best practices. Writes the
// JSON reports to .lighthouse/ (ignored by git). Usage: LH_BASE_URL=http://localhost:3000 npm run perf
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const base = process.env.LH_BASE_URL ?? "http://localhost:3000";
const share =
  "c=IN&cur=INR&s=193900&sn=New+York+University&sc=New+York&st=NY&sz=10012&t=65622&ts=school&y=2&sy=2027&ss=fall&ex=1";
const pages = [
  { name: "home", path: "/" },
  { name: "result", path: `/?${share}` },
  { name: "breakdown", path: `/estimate/breakdown?${share}` },
];
const floors = { performance: 0.9, accessibility: 0.95, "best-practices": 0.9 };

// Lighthouse needs a Chrome; Playwright's Chromium is already installed for the e2e suite.
if (!process.env.CHROME_PATH) {
  try {
    process.env.CHROME_PATH = require("playwright").chromium.executablePath();
  } catch {
    /* fall back to chrome-launcher's own search */
  }
}

const outDir = join(process.cwd(), ".lighthouse");
mkdirSync(outDir, { recursive: true });
const cli = require.resolve("lighthouse/cli/index.js");
let failed = false;
for (const page of pages) {
  const out = join(outDir, `${page.name}.json`);
  execFileSync(
    process.execPath,
    [
      cli,
      `${base}${page.path}`,
      "--quiet",
      "--chrome-flags=--headless=new --no-sandbox",
      "--only-categories=performance,accessibility,best-practices",
      "--output=json",
      `--output-path=${out}`,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  const report = JSON.parse(readFileSync(out, "utf8"));
  const scores = Object.fromEntries(
    Object.entries(report.categories).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)]),
  );
  const line = Object.entries(scores)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  const below = Object.entries(floors).filter(([k, min]) => (scores[k] ?? 0) < min * 100);
  console.log(`${below.length ? "FAIL" : "ok  "} ${page.name}: ${line}`);
  if (below.length) failed = true;
}
process.exit(failed ? 1 : 0);
