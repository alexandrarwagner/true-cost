import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * The home page is the designer's HTML, served as written: design/wired/E-homepage-wired.html
 * (see docs/proposals/2026-11-01-wired-page-plan.md). The file is read once per process in
 * production and on every request in development. Two serve-time changes only:
 * - the nonce the Content-Security-Policy needs on every script tag (set per request by
 *   proxy.ts); the file on disk never carries one, so the design lock compares the file;
 * - with ?engine=prototype, outside production or in DEMO_MODE, the real engine's script is
 *   swapped for the prototype's three (rate history, fan maths, adapter), so the pixel tests
 *   see the design with fixed numbers.
 *
 * Shared links of the form /?c=IN&... still open the shared page, which renders them.
 */
const FILE = join(process.cwd(), "design", "wired", "E-homepage-wired.html");
const REAL_ENGINE = '<script src="/engine.js"></script>';
const PROTOTYPE = [
  "/wired/prototype/fx-history.js",
  "/wired/prototype/fan-calc.js",
  "/wired/prototype/engine-adapter.js",
]
  .map((src) => `<script src="${src}"></script>`)
  .join("");
let cached: string | undefined;

function page(): string {
  if (process.env.NODE_ENV !== "production") return readFileSync(FILE, "utf8");
  cached ??= readFileSync(FILE, "utf8");
  return cached;
}

export function GET(request: Request): NextResponse {
  const url = new URL(request.url);
  // A shared link opens the shared page; with edit=1 the page itself fills its bar from it.
  if (url.searchParams.has("c") && url.searchParams.get("edit") !== "1") {
    return NextResponse.redirect(new URL(`/r${url.search}`, url), 307);
  }
  let html = page();
  const prototypeAllowed = process.env.NODE_ENV !== "production" || getEnv().isDemo;
  if (prototypeAllowed && url.searchParams.get("engine") === "prototype") {
    html = html.replace(REAL_ENGINE, PROTOTYPE);
  }
  const nonce = request.headers.get("x-nonce");
  if (nonce) html = html.replaceAll("<script", `<script nonce="${nonce}"`);
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
