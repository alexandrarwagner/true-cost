import "server-only";
import { frankfurterSource } from "@/lib/adapters/frankfurter";
import { hudSource } from "@/lib/adapters/hud";
import { mockSources } from "@/lib/adapters/mock/sources";
import { scorecardSource } from "@/lib/adapters/scorecard";
import type { DataSources } from "@/lib/adapters/types";
import { getEnv } from "./env";

let real: DataSources | undefined;

/** Fixture-backed sources in DEMO_MODE; otherwise the real adapters, built once. */
export function buildSources(): DataSources {
  const env = getEnv();
  if (env.isDemo) return mockSources;
  if (!real) {
    const schools = scorecardSource(env.scorecard.apiKey);
    real = { schools, rent: hudSource(env.hud.token), fx: frankfurterSource(), demo: false };
  }
  return real;
}

/**
 * "See an example first": the fixture school and rent figures that ship with the app, with the
 * real exchange rates, so the example works in production without a school lookup.
 */
export function exampleSources(): DataSources {
  const base = buildSources();
  return { schools: mockSources.schools, rent: mockSources.rent, fx: base.fx, demo: base.demo };
}
