import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnv, resetEnvForTests } from "@/lib/server/env";

const KEYS = [
  "NODE_ENV",
  "DEMO_MODE",
  "AI_ENABLED",
  "COMPARE_ENABLED",
  "SAVINGS_ENABLED",
  "DEAL_REPORT_URL",
  "DATA_GOV_API_KEY",
  "HUD_API_TOKEN",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "LOG_LEVEL",
];

beforeEach(() => {
  for (const k of KEYS) vi.stubEnv(k, undefined);
  vi.stubEnv("NODE_ENV", "test");
  resetEnvForTests();
});
afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("getEnv", () => {
  it("treats empty strings as unset and falls back to the memory rate limiter", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const env = getEnv();
    expect(env.ai.enabled).toBe(false);
    expect(env.scorecard.enabled).toBe(false);
    expect(env.rateLimit.backend).toBe("memory");
  });

  it("treats an empty flag as unset too, so a copied .env.example starts", () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("SAVINGS_ENABLED", "");
    vi.stubEnv("COMPARE_ENABLED", "");
    const env = getEnv();
    expect(env.savingsEnabled).toBe(true); // follows DEMO_MODE
    expect(env.compareEnabled).toBe(false);
  });

  it("enables fixtures-backed features in DEMO_MODE without keys", () => {
    vi.stubEnv("DEMO_MODE", "true");
    const env = getEnv();
    expect(env.isDemo).toBe(true);
    expect(env.ai.enabled).toBe(true);
    expect(env.scorecard.enabled).toBe(true);
  });

  it("respects feature flags", () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("AI_ENABLED", "false");
    vi.stubEnv("COMPARE_ENABLED", "true");
    expect(getEnv().ai.enabled).toBe(false);
    expect(getEnv().compareEnabled).toBe(true);
  });

  it("fails fast in production without the Scorecard key or a rate-limit backend", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getEnv()).toThrow(/DATA_GOV_API_KEY, UPSTASH_REDIS_REST_URL/);
  });

  it("fails fast in production when AI is configured without the bot check", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATA_GOV_API_KEY", "k");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    expect(() => getEnv()).toThrow(/TURNSTILE_SECRET_KEY/);
  });

  it("passes in production with DEMO_MODE and no keys", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "true");
    expect(getEnv().isDemo).toBe(true);
  });

  it("never includes values in its error message", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "not-a-url");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "SECRET-TOKEN-VALUE");
    let message = "";
    try {
      getEnv();
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    expect(message).toContain("UPSTASH_REDIS_REST_URL");
    expect(message).not.toContain("not-a-url");
    expect(message).not.toContain("SECRET-TOKEN-VALUE");
  });
});
