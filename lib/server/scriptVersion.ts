import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Script addresses carry a version, so a browser never pairs a new page with a script it
 * cached before a deploy: `/wired/deals.js` is served as `/wired/deals.js?v=<hash of the
 * file>`. The page itself is never cached; its scripts may be cached for a year once they
 * carry a version, since a change to a file changes its address.
 */
const SCRIPT_SRC = /src="(\/(?:wired\/[a-z0-9/-]+|engine)\.js)"/g;

export function fileHash(path: string): string | undefined {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 8);
  } catch {
    return undefined;
  }
}

/** Where a script address lives on disk: /wired/* under design/wired, /engine.js under public. */
export function scriptPath(src: string): string {
  return src.startsWith("/wired/")
    ? join(process.cwd(), "design", "wired", src.slice("/wired/".length))
    : join(process.cwd(), "public", src.slice(1));
}

/** Rewrites every page-script address with its file's version; a missing file keeps its address. */
export function versionScripts(html: string, hashFor: (src: string) => string | undefined): string {
  return html.replace(SCRIPT_SRC, (tag, src: string) => {
    const v = hashFor(src);
    return v ? `src="${src}?v=${v}"` : tag;
  });
}
