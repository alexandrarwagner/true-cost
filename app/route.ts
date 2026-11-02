import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * The home page is the designer's HTML, served as written: design/wired/E-homepage-wired.html
 * (see docs/proposals/2026-11-01-wired-page-plan.md). The file is read once per process in
 * production and on every request in development. The only serve-time change is the nonce
 * the Content-Security-Policy needs on every script tag (set per request by proxy.ts);
 * the file on disk never carries one, so the design lock compares the file, not the response.
 *
 * Shared links of the form /?c=IN&... still open the shared page, which renders them.
 */
const FILE = join(process.cwd(), "design", "wired", "E-homepage-wired.html");
let cached: string | undefined;

function page(): string {
  if (process.env.NODE_ENV !== "production") return readFileSync(FILE, "utf8");
  cached ??= readFileSync(FILE, "utf8");
  return cached;
}

export function GET(request: Request): NextResponse {
  const url = new URL(request.url);
  if (url.searchParams.has("c")) {
    return NextResponse.redirect(new URL(`/r${url.search}`, url), 307);
  }
  const nonce = request.headers.get("x-nonce");
  const html = nonce ? page().replaceAll("<script", `<script nonce="${nonce}"`) : page();
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
