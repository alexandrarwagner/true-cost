import "server-only";
import { z } from "zod";

// Every environment variable is validated here, once, and exposed as typed config.
// Nothing in this module ever logs a value: errors list variable names only.

const flag = (defaultValue: boolean) =>
  z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v === "true" || v === "1"));

// Empty strings (from a copied .env.example) count as unset.
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const RawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEMO_MODE: flag(false),
  AI_ENABLED: flag(true),
  COMPARE_ENABLED: flag(false),
  // Unset means "follow DEMO_MODE": on for previews, off in production until the copy is reviewed.
  SAVINGS_ENABLED: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true" || v === "1")),

  DATA_GOV_API_KEY: optionalString,
  HUD_API_TOKEN: optionalString,

  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().trim().min(1).default("claude-opus-5-5"),

  UPSTASH_REDIS_REST_URL: optionalString.pipe(z.url().optional()),
  UPSTASH_REDIS_REST_TOKEN: optionalString,

  TURNSTILE_SECRET_KEY: optionalString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,

  LOG_LEVEL: z.enum(["info", "debug"]).default("info"),
});

type RawEnv = z.infer<typeof RawEnvSchema>;

export interface AppEnv {
  nodeEnv: RawEnv["NODE_ENV"];
  isProd: boolean;
  isDemo: boolean;
  logLevel: RawEnv["LOG_LEVEL"];
  compareEnabled: boolean;
  savingsEnabled: boolean;
  scorecard: { enabled: boolean; apiKey?: string };
  hud: { token?: string };
  ai: { enabled: boolean; apiKey?: string; model: string };
  turnstile: { enabled: boolean; secretKey?: string; siteKey?: string };
  rateLimit: { backend: "memory" | "upstash"; url?: string; token?: string };
}

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

function buildEnv(raw: RawEnv): AppEnv {
  const isProd = raw.NODE_ENV === "production";
  const isDemo = raw.DEMO_MODE;
  const live = isProd && !isDemo;
  const missing: string[] = [];
  const warnings: string[] = [];

  const scorecardConfigured = raw.DATA_GOV_API_KEY !== undefined;
  if (live && !scorecardConfigured) missing.push("DATA_GOV_API_KEY");
  else if (!scorecardConfigured && !isDemo) warnings.push("DATA_GOV_API_KEY");

  const aiConfigured = raw.AI_ENABLED && raw.ANTHROPIC_API_KEY !== undefined;
  if (raw.AI_ENABLED && !aiConfigured && !isDemo) warnings.push("ANTHROPIC_API_KEY");

  const upstashConfigured =
    raw.UPSTASH_REDIS_REST_URL !== undefined && raw.UPSTASH_REDIS_REST_TOKEN !== undefined;
  if (live && !upstashConfigured) {
    if (raw.UPSTASH_REDIS_REST_URL === undefined) missing.push("UPSTASH_REDIS_REST_URL");
    if (raw.UPSTASH_REDIS_REST_TOKEN === undefined) missing.push("UPSTASH_REDIS_REST_TOKEN");
  }

  const turnstileConfigured =
    raw.TURNSTILE_SECRET_KEY !== undefined && raw.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== undefined;
  // The bot check guards the paid AI routes, so a live deployment with AI must have it.
  if (live && aiConfigured && !turnstileConfigured) {
    if (raw.TURNSTILE_SECRET_KEY === undefined) missing.push("TURNSTILE_SECRET_KEY");
    if (raw.NEXT_PUBLIC_TURNSTILE_SITE_KEY === undefined)
      missing.push("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  }

  if (missing.length > 0) {
    throw new EnvError(
      `Missing required environment variables for production: ${missing.join(", ")}. ` +
        "Set them, or set DEMO_MODE=true for a preview deployment.",
    );
  }
  if (warnings.length > 0 && raw.NODE_ENV !== "test") {
    console.warn(
      `[env] Not configured (missing key): ${warnings.join(", ")}. Those features are off.`,
    );
  }

  return {
    nodeEnv: raw.NODE_ENV,
    isProd,
    isDemo,
    logLevel: raw.LOG_LEVEL,
    compareEnabled: raw.COMPARE_ENABLED,
    savingsEnabled: raw.SAVINGS_ENABLED ?? isDemo,
    scorecard: { enabled: scorecardConfigured || isDemo, apiKey: raw.DATA_GOV_API_KEY },
    hud: { token: raw.HUD_API_TOKEN },
    ai: {
      enabled: aiConfigured || (isDemo && raw.AI_ENABLED),
      apiKey: raw.ANTHROPIC_API_KEY,
      model: raw.ANTHROPIC_MODEL,
    },
    turnstile: {
      enabled: turnstileConfigured,
      secretKey: raw.TURNSTILE_SECRET_KEY,
      siteKey: raw.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    },
    rateLimit: upstashConfigured
      ? { backend: "upstash", url: raw.UPSTASH_REDIS_REST_URL, token: raw.UPSTASH_REDIS_REST_TOKEN }
      : { backend: "memory" },
  };
}

let cached: AppEnv | undefined;

/** Parse and validate process.env once. Throws EnvError with variable names only. */
export function getEnv(): AppEnv {
  if (cached) return cached;
  const result = RawEnvSchema.safeParse(process.env);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => String(i.path[0] ?? "?")))];
    throw new EnvError(`Invalid environment variables: ${names.join(", ")}`);
  }
  cached = buildEnv(result.data);
  return cached;
}

/** Tests only: forget the cached config so the next getEnv() re-reads process.env. */
export function resetEnvForTests(): void {
  cached = undefined;
}
