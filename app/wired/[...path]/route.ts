import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * The designer's scripts, served from design/wired as they are (plan change 1: the page's
 * inline scripts moved into files so scripts stay nonce-only under the security policy).
 * Only plain .js names under that folder are served; nothing else is reachable.
 */
const DIR = join(process.cwd(), "design", "wired");
const SAFE = /^[a-z0-9-]+(\/[a-z0-9-]+)*\.js$/;

export function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  return ctx.params.then(({ path }) => {
    const name = path.join("/");
    if (!SAFE.test(name)) return new NextResponse(null, { status: 404 });
    try {
      const body = readFileSync(join(DIR, name), "utf8");
      return new NextResponse(body, {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control":
            process.env.NODE_ENV === "production" ? "public, max-age=3600" : "no-store",
          "x-content-type-options": "nosniff",
        },
      });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  });
}
