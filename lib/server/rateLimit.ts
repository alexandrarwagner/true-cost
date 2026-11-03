import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getEnv } from "./env";

// Two tiers: "general" for data routes, "ai" (stricter) for anything that spends on the model.
export type Tier = "general" | "ai";
export const LIMITS: Record<Tier, { perMinute: number; perDay: number }> = {
  // The school typeahead sends a request at every pause while typing, and a result loads four
  // or five data routes, so a person testing the site reached 300 a day (2 November).
  general: { perMinute: 120, perDay: 2000 },
  ai: { perMinute: 5, perDay: 30 },
};

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  limit(key: string): Promise<RateLimitResult>;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Sliding-window limiter for local dev and tests. State lives in this process only. */
export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limits: { perMinute: number; perDay: number },
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  async limit(key: string): Promise<RateLimitResult> {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((ts) => t - ts < DAY);
    const lastMinute = recent.filter((ts) => t - ts < MINUTE);
    if (lastMinute.length >= this.limits.perMinute) {
      const oldest = lastMinute[0] ?? t;
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + MINUTE - t) / 1000)) };
    }
    if (recent.length >= this.limits.perDay) {
      const oldest = recent[0] ?? t;
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + DAY - t) / 1000)) };
    }
    recent.push(t);
    if (!this.hits.has(key) && this.hits.size >= this.maxKeys) {
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey !== undefined) this.hits.delete(oldestKey);
    }
    this.hits.set(key, recent);
    return { ok: true, retryAfterSeconds: 0 };
  }
}

class UpstashRateLimiter implements RateLimiter {
  private readonly perMinute: Ratelimit;
  private readonly perDay: Ratelimit;

  constructor(redis: Redis, tier: Tier) {
    const l = LIMITS[tier];
    this.perMinute = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(l.perMinute, "1 m"),
      prefix: `tc:rl:${tier}:m`,
    });
    this.perDay = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(l.perDay, "1 d"),
      prefix: `tc:rl:${tier}:d`,
    });
  }

  async limit(key: string): Promise<RateLimitResult> {
    const minute = await this.perMinute.limit(key);
    if (!minute.success) return { ok: false, retryAfterSeconds: secondsUntil(minute.reset) };
    const day = await this.perDay.limit(key);
    if (!day.success) return { ok: false, retryAfterSeconds: secondsUntil(day.reset) };
    return { ok: true, retryAfterSeconds: 0 };
  }
}

function secondsUntil(epochMs: number): number {
  return Math.max(1, Math.ceil((epochMs - Date.now()) / 1000));
}

const instances = new Map<Tier, RateLimiter>();
let redis: Redis | undefined;

export function getRateLimiter(tier: Tier): RateLimiter {
  const existing = instances.get(tier);
  if (existing) return existing;
  const { rateLimit } = getEnv();
  let limiter: RateLimiter;
  if (rateLimit.backend === "upstash" && rateLimit.url && rateLimit.token) {
    redis ??= new Redis({ url: rateLimit.url, token: rateLimit.token });
    limiter = new UpstashRateLimiter(redis, tier);
  } else {
    limiter = new MemoryRateLimiter(LIMITS[tier]);
  }
  instances.set(tier, limiter);
  return limiter;
}

/** Best-effort client IP behind Vercel's proxy. Used only as a rate-limit key, never logged. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}
