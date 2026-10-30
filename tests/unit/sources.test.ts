import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/server/env";
import { buildSources } from "@/lib/server/sources";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  resetEnvForTests();
});
afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("buildSources", () => {
  it("returns fixtures in DEMO_MODE and real adapters otherwise", () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect(buildSources().demo).toBe(true);
    resetEnvForTests();
    vi.stubEnv("DEMO_MODE", "false");
    const real = buildSources();
    expect(real.demo).toBe(false);
    expect(typeof real.schools.search).toBe("function");
  });
});
