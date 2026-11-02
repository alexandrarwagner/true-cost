import type { BuildResult } from "esbuild";

export function buildEngine(opts?: { write?: boolean; minify?: boolean }): Promise<BuildResult>;
