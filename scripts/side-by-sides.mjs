/**
 * Side-by-sides for the designer: reference (the kit's PNG) next to the build (Playwright's
 * actual capture) and the diff, one image per comparison, from a failed or passed run of the
 * design-v2 projects.
 *
 *   npx playwright test --project design-v2 ; node scripts/side-by-sides.mjs [out-dir]
 *
 * Reads the design-v2 results under test-results for *-actual.png, the matching reference and the
 * recorded measurement (helpers/compare.ts),
 * renders each trio in a page and screenshots it. Playwright's own chromium does the drawing,
 * so no image library is needed. Output: design/reference-v2/side-by-sides/<name>.png
 * (gitignored unless kept on purpose).
 */
import { readdirSync, readFileSync, statSync, mkdirSync, existsSync } from "node:fs";
import { basename, join, dirname } from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const out = process.argv[2] ?? "design/reference-v2/side-by-sides";
mkdirSync(join(root, out), { recursive: true });

function walk(dir, found = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, found);
    else if (f.endsWith("-actual.png") && p.includes("design-v2")) found.push(p);
  }
  return found;
}
const dataUrl = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;

const actuals = existsSync(join(root, "test-results")) ? walk(join(root, "test-results")) : [];
if (actuals.length === 0) {
  console.log("no *-actual.png under test-results; run the design-v2 project first");
  process.exit(0);
}
const browser = await chromium.launch();
const page = await browser.newPage();
let n = 0;
for (const actual of actuals) {
  const name = basename(actual).replace(/-actual\.png$/, "");
  const dir = dirname(actual);
  const expected = join(dir, `${name}-expected.png`);
  const diff = join(dir, `${name}-diff.png`);
  if (!existsSync(expected)) continue;
  const note = join(root, "test-results", "design-v2", `${name}.txt`);
  const measured = existsSync(note) ? readFileSync(note, "utf8").trim() : "";
  const cols = [
    ["Reference", expected],
    ["Build", actual],
  ];
  if (existsSync(diff)) cols.push(["Diff", diff]);
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#F2F3F5;font:14px system-ui}
    .row{display:flex;width:max-content;gap:16px;padding:16px;align-items:flex-start}
    figure{margin:0;display:flex;flex-direction:column;gap:6px}
    figcaption{font-weight:600;color:#14151F}
    img{display:block;max-width:none;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  </style><div class="row">${cols
    .map(
      ([label, p]) =>
        `<figure><figcaption>${label}: ${name}${label === "Build" && measured ? ` — ${measured}` : ""}</figcaption><img src="${dataUrl(p)}"></figure>`,
    )
    .join("")}</div>`);
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  const row = page.locator(".row");
  const box = await row.boundingBox();
  await page.setViewportSize({
    width: Math.min(16000, Math.ceil(box.width) + 32),
    height: Math.min(16000, Math.ceil(box.height) + 32),
  });
  await row.screenshot({ path: join(root, out, `${name}.png`) });
  n++;
}
await browser.close();
console.log(`${n} side-by-sides written to ${out}`);
