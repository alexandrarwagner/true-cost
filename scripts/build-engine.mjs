// Bundles the cost engine for the browser: lib/browser/engine.ts becomes public/engine.js, a
// classic script that defines window.TPEngine (the contract in design/wired/engine-adapter.js).
// Runs before `next build` (prebuild) and before the end-to-end tests in CI. The bundle holds
// no keys: school costs, rent and rate history come from the API routes at run time.
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

export async function buildEngine({ write = true, minify = true } = {}) {
  const result = await build({
    entryPoints: [join(root, "lib/browser/main.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    minify,
    sourcemap: false,
    write,
    outfile: join(root, "public/engine.js"),
    legalComments: "none",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      __ENGINE_VERSION__: JSON.stringify(`engine-${pkg.version}`),
    },
    logLevel: "silent",
  });
  return result;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ""))) {
  const result = await buildEngine();
  if (result.errors.length > 0) {
    console.error(result.errors);
    process.exit(1);
  }
  console.log("public/engine.js built");
}
