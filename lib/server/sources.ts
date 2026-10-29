import "server-only";
import { mockSources } from "@/lib/adapters/mock/sources";
import type { DataSources } from "@/lib/adapters/types";
import { getEnv } from "./env";
import { DataUnavailableError } from "./errors";

/** Picks fixture-backed or real sources. Real adapters arrive in build step 5. */
export function buildSources(): DataSources {
  const env = getEnv();
  if (env.isDemo) return mockSources;
  throw new DataUnavailableError("sources", "real_adapters_not_built_yet");
}
